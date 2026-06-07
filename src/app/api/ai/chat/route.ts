import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { settings, aiChats, visits, branches, shortages, users } from '@/db/schema';
import { eq, and, gte, count, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { getTodayRange } from '@/lib/date-utils';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
});

async function getSystemContext() {
  const { start: today, end: tomorrow } = getTodayRange();

  // Get today's stats
  const todayVisits = await db
    .select({ count: count() })
    .from(visits)
    .where(gte(visits.createdAt, today));

  const completedVisits = await db
    .select({ count: count() })
    .from(visits)
    .where(and(gte(visits.createdAt, today), eq(visits.status, 'completed')));

  const totalBranches = await db
    .select({ count: count() })
    .from(branches)
    .where(eq(branches.active, true));

  const totalShortages = await db
    .select({ count: count() })
    .from(shortages)
    .innerJoin(visits, eq(shortages.visitId, visits.id))
    .where(gte(visits.createdAt, today));

  const activeReps = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.role, 'representative'), eq(users.active, true)));

  // Get recent shortages
  const recentShortages = await db
    .select({
      productName: shortages.productName,
      branchName: branches.name,
    })
    .from(shortages)
    .innerJoin(visits, eq(shortages.visitId, visits.id))
    .innerJoin(branches, eq(visits.branchId, branches.id))
    .orderBy(desc(shortages.createdAt))
    .limit(10);

  return `
System Data Context (Current as of ${new Date().toISOString()}):
- Today's Total Visits: ${todayVisits[0]?.count || 0}
- Completed Visits Today: ${completedVisits[0]?.count || 0}
- Active Branches: ${totalBranches[0]?.count || 0}
- Today's Shortages: ${totalShortages[0]?.count || 0}
- Active Representatives: ${activeReps[0]?.count || 0}
- Recent Shortages: ${recentShortages.map((s) => `${s.productName} at ${s.branchName}`).join(', ') || 'None'}
`;
}

async function callGoogleAI(apiKey: string, model: string, systemPrompt: string, userMessage: string): Promise<string> {
  // Determine the correct model name
  let modelName = model;
  if (!modelName.startsWith('models/')) {
    if (modelName.includes('gemini')) {
      modelName = `models/${modelName}`;
    } else {
      modelName = 'models/gemini-1.5-flash';
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\nUser: ${userMessage}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Google AI API error:', error);
    throw new Error(`Google AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response from AI';
}

async function callAnthropicAI(apiKey: string, model: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Anthropic API request failed');
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'No response from AI';
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(['admin', 'supervisor']);

    const body = await request.json();
    const validation = chatSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { message } = validation.data;

    // Get AI settings - check both 'ai' category and keys starting with 'ai_'
    const aiSettings = await db.select().from(settings);

    const settingsMap = aiSettings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string | null>);

    const apiKey = settingsMap['ai_api_key'] || process.env.OPENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const provider = settingsMap['ai_provider'] || 'openai';
    const model = settingsMap['ai_model'] || 'gpt-3.5-turbo';

    // Get system context for AI
    const context = await getSystemContext();

    if (!apiKey) {
      // Return a helpful response without AI
      const fallbackResponse = `
لم يتم تكوين مفتاح API للذكاء الاصطناعي. إليك البيانات المتاحة حالياً:

${context}

يرجى تكوين إعدادات الذكاء الاصطناعي من لوحة الإعدادات للحصول على تحليلات متقدمة.
      `.trim();

      await db.insert(aiChats).values({
        userId: user.id,
        message,
        response: fallbackResponse,
        context,
      });

      return NextResponse.json({ response: fallbackResponse, hasAI: false });
    }

    const systemPrompt = `You are an AI assistant for a Field Representatives Management System (نظام إدارة المندوبين الميدانيين). You help analyze visit data, shortages, and provide insights. Respond in the same language as the user's message (Arabic or English). Be helpful, concise, and provide actionable insights when possible.

Here is the current system data:
${context}`;

    let aiResponse = '';

    try {
      if (provider === 'google') {
        aiResponse = await callGoogleAI(apiKey, model, systemPrompt, message);
      } else if (provider === 'anthropic') {
        aiResponse = await callAnthropicAI(apiKey, model, systemPrompt, message);
      } else {
        // Default to OpenAI
        aiResponse = await callOpenAI(apiKey, model, systemPrompt, message);
      }
    } catch (aiError) {
      console.error('AI API error:', aiError);
      aiResponse = `حدث خطأ في الاتصال بالذكاء الاصطناعي (${provider}). تأكد من صحة مفتاح API والنموذج المحدد.\n\nإليك البيانات المتاحة:\n${context}`;
    }

    // Save chat history
    await db.insert(aiChats).values({
      userId: user.id,
      message,
      response: aiResponse,
      context,
    });

    return NextResponse.json({ response: aiResponse, hasAI: !!apiKey });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('AI chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireAuth(['admin', 'supervisor']);

    const history = await db
      .select()
      .from(aiChats)
      .where(eq(aiChats.userId, user.id))
      .orderBy(desc(aiChats.createdAt))
      .limit(50);

    return NextResponse.json({ history });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get AI history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
