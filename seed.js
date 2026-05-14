const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const studentsNames = [
    "Ali Khan", "Usman Ali", "Bilal Ahmed", "Hamza Tariq", "Umar Farooq",
    "Zain Abbas", "Faizan Raza", "Saad Mahmood", "Hassan Nawaz", "Hussain Rizvi",
    "Ayesha Malik", "Fatima Noor", "Zainab Jamil", "Maryam Safdar", "Sana Riaz",
    "Hira Qureshi", "Iqra Shah", "Nida Javed", "Rabia Aslam", "Sara Iqbal"
];

const supervisorsNames = [
    "Dr. Tariq Mahmood", "Dr. Kamran Qureshi", "Dr. Faisal Riaz", "Dr. Imran Ali", "Dr. Junaid Iqbal",
    "Dr. Farooq Shah", "Dr. Rizwan Jamil", "Dr. Naveed Abbas", "Dr. Shahzad Hassan", "Dr. Kashif Raza",
    "Dr. Asim Javed", "Dr. Waqas Ahmed", "Prof. Sajjad Nawaz", "Prof. Shoaib Malik", "Prof. Noman Tariq",
    "Prof. Yasir Farooq", "Dr. Salman Aslam", "Dr. Adeel Safdar", "Dr. Waseem Khan", "Dr. Zeeshan Noor"
];

async function seed() {
    const client = new Client({
        connectionString: 'postgresql://neondb_owner:npg_M0qQaXdmO1lb@ep-dark-glade-aoyzhowa-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
        ssl: {
            rejectUnauthorized: false
        }
    });

    await client.connect();
    
    try {
        const hashedPassword = await bcrypt.hash('12345', 10);
        console.log("Hashed password created.");

        // Insert Students
        for (let i = 0; i < 20; i++) {
            const name = studentsNames[i];
            const email = `student${i+1}@gmail.com`;
            const role = 'student';
            
            const userRes = await client.query(
                `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id`,
                [name, email, hashedPassword, role]
            );
            const userId = userRes.rows[0].id;

            const regNo = `SP20-BCS-${(i+1).toString().padStart(3, '0')}`;
            const fatherName = "Father of " + name.split(' ')[0];
            const dept = "Computer Science";

            await client.query(
                `INSERT INTO students (user_id, reg_no, father_name, department) VALUES ($1, $2, $3, $4)`,
                [userId, regNo, fatherName, dept]
            );
            console.log(`Inserted Student: ${name} with email: ${email} and Reg No: ${regNo}`);
        }

        // Insert Supervisors
        for (let i = 0; i < 20; i++) {
            const name = supervisorsNames[i];
            const email = `supervisor${i+1}@cuilahore.edu.pk`;
            const role = 'supervisor';
            
            const userRes = await client.query(
                `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id`,
                [name, email, hashedPassword, role]
            );
            const userId = userRes.rows[0].id;

            const expertise = `{AI,Web,Mobile}`; // postgres array literal
            const designation = "Assistant Professor";
            const maxGroups = 3;

            await client.query(
                `INSERT INTO supervisors (user_id, expertise, designation, "maxGroups") VALUES ($1, $2, $3, $4)`,
                [userId, expertise, designation, maxGroups]
            );
            console.log(`Inserted Supervisor: ${name} with email: ${email}`);
        }

        console.log("Seeding completed successfully!");
    } catch (err) {
        console.error("Error during seeding:", err);
    } finally {
        await client.end();
    }
}

seed();
