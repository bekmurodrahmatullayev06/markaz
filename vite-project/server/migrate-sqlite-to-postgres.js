import { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  closeDatabase,
  databaseKind,
  initializeDatabase,
  transaction,
} from './database.js'

if (databaseKind() !== 'postgres') {
  throw new Error('Ma’lumotlarni ko‘chirish uchun DATABASE_URL PostgreSQL manzili bo‘lishi kerak.')
}

const dataDir = resolve(process.env.FUTURE_STEP_DATA_DIR || join(import.meta.dirname, 'data'))
const sqlitePath = join(dataDir, 'future-step.sqlite')
if (!existsSync(sqlitePath)) {
  throw new Error(`SQLite manba bazasi topilmadi: ${sqlitePath}`)
}

const source = new DatabaseSync(sqlitePath, { readOnly: true })

try {
  await initializeDatabase()
  const users = source.prepare(`
    SELECT id, username, name, role, password_hash, phone, group_name, schedule, created_at
    FROM users
  `).all()
  const attendance = source.prepare(`
    SELECT id, user_id, day, check_in, check_out, marked_by
    FROM attendance
  `).all()
  const sourceTables = new Set(source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name))
  const paymentPlans = sourceTables.has('student_payment_plans')
    ? source.prepare('SELECT user_id, monthly_amount, next_due_date FROM student_payment_plans').all()
    : []
  const payments = sourceTables.has('payments')
    ? source.prepare('SELECT id, user_id, amount, paid_at, created_at FROM payments').all()
    : []
  const lessons = sourceTables.has('lessons')
    ? source.prepare('SELECT id, subject, teacher_id, weekday, start_time, end_time, created_at FROM lessons').all()
    : []
  const subjectNames = sourceTables.has('subjects')
    ? source.prepare('SELECT name FROM subjects').all().map((row) => row.name)
    : []
  const subjects = [...new Map(
    [...subjectNames, ...lessons.map((lesson) => lesson.subject)]
      .map((name) => [name.toLocaleLowerCase('uz'), name]),
  ).values()]
  const lessonStudents = sourceTables.has('lesson_students')
    ? source.prepare('SELECT lesson_id, student_id, created_at FROM lesson_students').all()
    : []
  const lessonFeedback = sourceTables.has('lesson_feedback')
    ? source.prepare('SELECT lesson_id, student_id, lesson_day, comment, created_at, updated_at FROM lesson_feedback').all()
    : []
  const lessonAttendance = sourceTables.has('lesson_attendance')
    ? source.prepare('SELECT lesson_id, student_id, lesson_day, status, marked_by, marked_at FROM lesson_attendance').all()
    : []
  const settings = source.prepare(`
    SELECT center_name, slogan, description, phone, address, telegram, instagram, courses
    FROM center_settings WHERE id = 1
  `).get()

  await transaction(async (connection) => {
    await connection.run('LOCK TABLE sessions, attendance, center_settings, login_attempts, student_payment_plans, payments, lessons, subjects, lesson_students, lesson_feedback, lesson_attendance IN EXCLUSIVE MODE')
    const populated = await connection.one(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM sessions) AS sessions,
        (SELECT COUNT(*) FROM attendance) AS attendance,
        (SELECT COUNT(*) FROM login_attempts) AS login_attempts,
        (SELECT COUNT(*) FROM student_payment_plans) AS payment_plans,
        (SELECT COUNT(*) FROM payments) AS payments,
        (SELECT COUNT(*) FROM lessons) AS lessons,
        (SELECT COUNT(*) FROM subjects) AS subjects,
        (SELECT COUNT(*) FROM lesson_students) AS lesson_students,
        (SELECT COUNT(*) FROM lesson_feedback) AS lesson_feedback,
        (SELECT COUNT(*) FROM lesson_attendance) AS lesson_attendance
    `)
    if (Object.values(populated).some((count) => Number(count) !== 0)) {
      throw new Error('Maqsad PostgreSQL bazasi bo‘sh emas; mavjud ma’lumotlar o‘zgartirilmadi.')
    }

    const currentSettings = await connection.one('SELECT * FROM center_settings WHERE id = 1')
    const defaultValues = {
      center_name: '',
      slogan: 'Bilim bilan kelajak sari.',
      description: '',
      phone: '',
      address: '',
      telegram: '',
      instagram: '',
      courses: '',
    }
    if (Object.entries(defaultValues).some(([key, value]) => currentSettings[key] !== value)) {
      throw new Error('Maqsad bazasidagi markaz sozlamalari boshlang‘ich qiymatda emas; ma’lumotlar o‘zgartirilmadi.')
    }

    for (const user of users) {
      await connection.run(`
        INSERT INTO users (id, username, name, role, password_hash, phone, group_name, schedule, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, user.id, user.username, user.name, user.role, user.password_hash, user.phone, user.group_name, user.schedule, user.created_at)
    }
    for (const row of attendance) {
      await connection.run(`
        INSERT INTO attendance (id, user_id, day, check_in, check_out, marked_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, row.id, row.user_id, row.day, row.check_in, row.check_out, row.marked_by)
    }
    for (const plan of paymentPlans) {
      await connection.run(`
        INSERT INTO student_payment_plans (user_id, monthly_amount, next_due_date)
        VALUES (?, ?, ?)
      `, plan.user_id, plan.monthly_amount, plan.next_due_date)
    }
    for (const payment of payments) {
      await connection.run(`
        INSERT INTO payments (id, user_id, amount, paid_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, payment.id, payment.user_id, payment.amount, payment.paid_at, payment.created_at)
    }
    for (const lesson of lessons) {
      await connection.run(`
        INSERT INTO lessons (id, subject, teacher_id, weekday, start_time, end_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, lesson.id, lesson.subject, lesson.teacher_id, lesson.weekday, lesson.start_time, lesson.end_time, lesson.created_at)
    }
    for (const name of subjects) {
      await connection.run('INSERT INTO subjects (name) VALUES (?)', name)
    }
    for (const enrollment of lessonStudents) {
      await connection.run(`
        INSERT INTO lesson_students (lesson_id, student_id, created_at)
        VALUES (?, ?, ?)
      `, enrollment.lesson_id, enrollment.student_id, enrollment.created_at)
    }
    for (const feedback of lessonFeedback) {
      await connection.run(`
        INSERT INTO lesson_feedback (lesson_id, student_id, lesson_day, comment, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, feedback.lesson_id, feedback.student_id, feedback.lesson_day,
      feedback.comment, feedback.created_at, feedback.updated_at)
    }
    for (const record of lessonAttendance) {
      await connection.run(`
        INSERT INTO lesson_attendance (lesson_id, student_id, lesson_day, status, marked_by, marked_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, record.lesson_id, record.student_id, record.lesson_day,
      record.status, record.marked_by, record.marked_at)
    }
    if (settings) {
      await connection.run(`
        UPDATE center_settings
        SET center_name = ?, slogan = ?, description = ?, phone = ?, address = ?,
          telegram = ?, instagram = ?, courses = ?
        WHERE id = 1
      `, settings.center_name, settings.slogan, settings.description, settings.phone,
      settings.address, settings.telegram, settings.instagram, settings.courses)
    }
  }, { lockUsers: true })

  console.log(`SQLite-ээс PostgreSQL’ga ${users.length} ta hisob, ${attendance.length} ta davomat, ${paymentPlans.length} ta to‘lov rejasi, ${payments.length} ta to‘lov, ${lessons.length} ta dars, ${subjects.length} ta fan, ${lessonStudents.length} ta darsga yozilish, ${lessonFeedback.length} ta dars izohi, ${lessonAttendance.length} ta dars davomati va markaz sozlamalari ko‘chirildi.`)
  console.log('Faol sessiyalar xavfsizlik sababli ko‘chirilmadi; foydalanuvchilar qayta tizimga kirishi kerak.')
} finally {
  source.close()
  await closeDatabase()
}
