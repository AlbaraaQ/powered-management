import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, branches, settings, notifications } from '@/db/schema';
import { hashPassword } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    // Check if already seeded
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);

    if (existingAdmin.length > 0) {
      return NextResponse.json({ message: 'Database already seeded' });
    }

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    await db.insert(users).values({
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      name: 'System Administrator',
      nameAr: 'مدير النظام',
      role: 'admin',
      active: true,
    });

    // Create supervisor
    const supervisorPassword = await hashPassword('supervisor123');
    await db.insert(users).values({
      username: 'supervisor',
      email: 'supervisor@example.com',
      password: supervisorPassword,
      name: 'Supervisor One',
      nameAr: 'المشرف الأول',
      role: 'supervisor',
      phone: '+966500000001',
      active: true,
    });

    // Create representatives
    const repPassword = await hashPassword('rep123');
    const rep1 = await db.insert(users).values({
      username: 'rep1',
      email: 'rep1@example.com',
      password: repPassword,
      name: 'Ahmad Mohammed',
      nameAr: 'أحمد محمد',
      role: 'representative',
      phone: '+966500000002',
      active: true,
    }).returning();

    await db.insert(users).values({
      username: 'rep2',
      email: 'rep2@example.com',
      password: repPassword,
      name: 'Khalid Ali',
      nameAr: 'خالد علي',
      role: 'representative',
      phone: '+966500000003',
      active: true,
    });

    // Create client
    const clientPassword = await hashPassword('client123');
    const client1 = await db.insert(users).values({
      username: 'client1',
      email: 'client1@example.com',
      password: clientPassword,
      name: 'ABC Company',
      nameAr: 'شركة أ ب ج',
      role: 'client',
      phone: '+966500000004',
      active: true,
    }).returning();

    // Create branches
    await db.insert(branches).values([
      {
        name: 'Riyadh Mall Branch',
        nameAr: 'فرع الرياض مول',
        address: 'Riyadh Mall, King Fahd Road, Riyadh',
        addressAr: 'الرياض مول، طريق الملك فهد، الرياض',
        latitude: '24.7136',
        longitude: '46.6753',
        clientId: client1[0].id,
        contactName: 'Mohammed Ahmed',
        contactPhone: '+966501234567',
        active: true,
      },
      {
        name: 'Jeddah Center Branch',
        nameAr: 'فرع جدة سنتر',
        address: 'Jeddah Center, Tahlia Street, Jeddah',
        addressAr: 'جدة سنتر، شارع التحلية، جدة',
        latitude: '21.5169',
        longitude: '39.2192',
        clientId: client1[0].id,
        contactName: 'Ali Hassan',
        contactPhone: '+966507654321',
        active: true,
      },
      {
        name: 'Dammam Plaza Branch',
        nameAr: 'فرع الدمام بلازا',
        address: 'Dammam Plaza, King Saud Street, Dammam',
        addressAr: 'الدمام بلازا، شارع الملك سعود، الدمام',
        latitude: '26.4207',
        longitude: '50.0888',
        clientId: client1[0].id,
        contactName: 'Fahad Salem',
        contactPhone: '+966509876543',
        active: true,
      },
    ]);

    // Create default settings
    await db.insert(settings).values([
      {
        key: 'app_name',
        value: 'Field Reps Manager',
        description: 'Application name',
        category: 'general',
      },
      {
        key: 'app_name_ar',
        value: 'إدارة المندوبين',
        description: 'Application name in Arabic',
        category: 'general',
      },
      {
        key: 'max_photos_per_visit',
        value: '2',
        description: 'Maximum photos allowed per visit',
        category: 'visits',
      },
      {
        key: 'ai_provider',
        value: 'openai',
        description: 'AI service provider',
        category: 'ai',
      },
      {
        key: 'ai_model',
        value: 'gpt-3.5-turbo',
        description: 'AI model to use',
        category: 'ai',
      },
      {
        key: 'ai_api_key',
        value: '',
        description: 'AI API key',
        category: 'ai',
      },
    ]);

    // Get admin user for notifications
    const adminUser = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    
    if (adminUser.length > 0) {
      // Create sample notifications
      await db.insert(notifications).values([
        {
          userId: adminUser[0].id,
          type: 'success',
          title: 'Welcome to Field Reps Manager',
          titleAr: 'مرحباً بك في نظام إدارة المندوبين',
          message: 'Your account has been set up successfully. Start by adding branches and representatives.',
          messageAr: 'تم إعداد حسابك بنجاح. ابدأ بإضافة الفروع والمندوبين.',
        },
        {
          userId: adminUser[0].id,
          type: 'info',
          title: 'System Update Available',
          titleAr: 'تحديث النظام متوفر',
          message: 'New features have been added to improve your experience.',
          messageAr: 'تمت إضافة ميزات جديدة لتحسين تجربتك.',
        },
        {
          userId: adminUser[0].id,
          type: 'warning',
          title: 'Configure AI Settings',
          titleAr: 'قم بإعداد الذكاء الاصطناعي',
          message: 'Add your AI API key in settings to enable smart analytics.',
          messageAr: 'أضف مفتاح API للذكاء الاصطناعي في الإعدادات لتفعيل التحليلات الذكية.',
        },
      ]);
    }

    return NextResponse.json({
      message: 'Database seeded successfully',
      credentials: {
        admin: { username: 'admin', password: 'admin123' },
        supervisor: { username: 'supervisor', password: 'supervisor123' },
        representative: { username: 'rep1', password: 'rep123' },
        client: { username: 'client1', password: 'client123' },
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    );
  }
}
