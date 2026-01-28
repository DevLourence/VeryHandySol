const bcrypt = require('bcryptjs');

// Script to create admin user
async function createAdmin() {
    const hashedPassword = await bcrypt.hash('veryhandy2026', 10);

    const adminUser = {
        id: 'admin-' + Date.now(),
        name: 'VH Admin',
        email: 'veryhandysolution@gmail.com',
        password: hashedPassword,
        address: 'Admin Office',
        age: 30,
        emailVerified: true,
        role: 'admin',
        createdAt: new Date()
    };

    console.log('\n✅ Admin User Created:');
    console.log(JSON.stringify(adminUser, null, 2));
    console.log('\n📧 Email: veryhandysolution@gmail.com');
    console.log('🔑 Password: veryhandy2026');
    console.log('👤 Role: admin');
    console.log('\nCopy this object and add it to the users array in server-test.js\n');
}

createAdmin();
