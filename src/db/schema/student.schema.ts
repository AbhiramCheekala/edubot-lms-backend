import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { BatchPartial, BatchTable } from './batch.schema.js';
import { Login, LoginKey, LoginTable } from './login.schema.js';
import { Organization, OrganizationTable, OrgKey } from './organization.schema.js';
import { Role, RoleKey } from './role.schema.js';
import { BinaryObjectTable } from './binaryObject.schema.js';

export const StudentTable = pgTable('student', {
  studentId: uuid('id').defaultRandom().primaryKey().notNull(),
  givenStudentId: varchar('given_student_id', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  personalEmail: varchar('personal_email', { length: 255 }).unique(),
  dateOfBirth: timestamp('date_of_birth', { precision: 3, mode: 'date' }),
  apsche: boolean('apsche').default(false).notNull(),
  gender: varchar('gender', { length: 10 }).notNull(),
  orgId: uuid('org_id')
    .references(() => OrganizationTable.id)
    .notNull(),
  batchId: uuid('batch_id')
    .references(() => BatchTable.batchId)
    .notNull(),
  loginId: uuid('login_id')
    .references(() => LoginTable.loginId)
    .notNull()
    .unique(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  joiningDate: timestamp('joiningDate', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  contactPhoneNumber: jsonb('contact_phone_number')
    .$type<{ countryCode: string; number: string }>()
    .notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  //   Full name
  // language known
  // full address
  // linkedinurl
  // githuburl
  // educationHSC
  // subject specialization
  // mention year
  // education university or college
  // subject
  languagesKnown: jsonb('languages_known').$type<string[]>(),
  fullAddress: text('full_address'),
  linkedinUrl: varchar('linkedin_url', { length: 255 }),
  githubUrl: varchar('github_url', { length: 255 }),
  educationHSCName: varchar('education_hsc_name', { length: 255 }),
  educationHSCSubjectSpecialization: varchar('education_hsc_subject_specialization', {
    length: 255
  }),
  educationHSCMentionYear: varchar('education_hsc_mention_year', { length: 255 }),
  educationUniversityOrCollege: varchar('education_university_or_college', { length: 255 }),
  educationUniversityOrCollegeSubjectSpecialization: varchar(
    'education_university_or_college_subject_specialization',
    {
      length: 255
    }
  ),
  educationUniversityOrCollegeSubject: varchar('education_university_or_college_subject', {
    length: 255
  }),
  profilePicture: uuid('profile_picture').references(() => BinaryObjectTable.binaryObjectId)
});

export const StudentRelations = relations(StudentTable, ({ one }) => ({
  Org: one(OrganizationTable, {
    fields: [StudentTable.orgId],
    references: [OrganizationTable.id]
  }),
  Batch: one(BatchTable, {
    fields: [StudentTable.batchId],
    references: [BatchTable.batchId]
  }),
  Login: one(LoginTable, {
    fields: [StudentTable.loginId],
    references: [LoginTable.loginId]
  })
}));

export type StudentFull = InferSelectModel<typeof StudentTable>;
export type Student = Omit<StudentFull, 'password' | 'updatedAt' | 'createdAt'>;
export type StudentInsert = InferInsertModel<typeof StudentTable>;
export type StudentPartial = Partial<
  // Student & Login & { organization: Organization } & { role: Role }
  Student & Login & Organization & Role & { batch: BatchPartial }
>;
export type StudentSortColumn =
  | Extract<keyof Student, 'name' | 'givenStudentId'>
  | 'orgName'
  | 'email';
export type StudentSearchColumn =
  | Extract<keyof Student, 'name' | 'givenStudentId' | 'isActive'>
  | 'orgName'
  | 'email'
  | 'batchId';
export type StudentKey = keyof Student;
export type StudentKeyFull = StudentKey | LoginKey | OrgKey | RoleKey;
