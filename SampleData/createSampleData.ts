import { eq, InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createBatchObjectsWithBatchNames } from '../src/controllers/semester.controller.js';
import { db, Schema } from '../src/db/db.js';
import { OrganizationTable, UserTable } from '../src/db/schema/index.js';
import { BatchInsert, BatchTable } from '../src/db/schema/batch.schema.js';
import { CourseTable } from '../src/db/schema/course.schema.js';
import { LoginTable } from '../src/db/schema/login.schema.js';
import { RoleTable } from '../src/db/schema/role.schema.js';
import { insertOrganization } from '../src/models/organization.model.js';
import { userService } from '../src/services/index.js';
import organizationService from '../src/services/organization.service.js';
import { createSemester as createSemesterService } from '../src/services/semester.service.js';
import { createStudent } from '../src/services/student.service.js';
import { generateRandomPassword } from '../src/utils/encryption.js';
import logger from '../src/config/logger.js';
import ApiError from '../src/utils/ApiError.js';
import programService from '../src/services/program.service.js';
import httpStatus from 'http-status';

export async function createRole(
  role: InferInsertModel<typeof RoleTable>
): Promise<InferSelectModel<typeof RoleTable>> {
  const [newUser] = await db.insert(RoleTable).values(role).returning();
  return newUser;
}

export async function createSampleRoles() {
  const roles = [
    { roleName: 'Mentor', permissionSetName: 'Mentor' },
    { roleName: 'Admin', permissionSetName: 'Admin' },
    { roleName: 'DataManagementTeam', permissionSetName: 'DataManagementTeam' },
    { roleName: 'Faculty', permissionSetName: 'Faculty' },
    { roleName: 'OrgLeader', permissionSetName: 'OrgLeader' },
    // { roleName: 'Grader', permissionSetName: 'Grader' },
    { roleName: 'Student', permissionSetName: 'Student' }
  ];
  const insertedRoles: InferInsertModel<typeof RoleTable>[] = [];
  for (const role of roles) {
    const newRole = await createRole(role);
    insertedRoles.push(newRole);
    console.log(newRole);
  }
  return insertedRoles;
}

export async function createSampleOrgs() {
  const orgs = [
    {
      name: 'SRM University',
      givenOrgId: 'DSRM123',
      state: 'Tamil Nadu',
      address: 'SRM Nagar, Kattankulathur - 603 203 Chengalpattu District, Tamil Nadu.',
      pincode: '603203',
      email: 'infodesk@srmist.edu.in',
      contactPhoneNumber: { countryCode: 'IN', number: '4427417400' },
      isActive: true
    },
    {
      name: 'APSCHE',
      givenOrgId: 'DAPSCHE123',
      state: 'Andhra Pradesh',
      address:
        '10th Block, East Wing, Jawahar Lal Nehru Technological University Anantapur, Ananthapuramu, Andhra Pradesh 515002',
      pincode: '515002',
      email: 'helpdeskapeapcet@apsche.org',
      contactPhoneNumber: { countryCode: 'IN', number: '8552579763' },
      isActive: true
    },
    {
      name: 'Edubot',
      givenOrgId: 'DEDUBOT123',
      state: 'Telangana',
      address:
        'Plot No. 2, 2nd Floor, Srinivasa Nagar Colony, Ameerpet, Hyderabad, Telangana 500038',
      pincode: '500038',
      email: 'info@edbubot.org',
      contactPhoneNumber: { countryCode: 'IN', number: '4023737373' },
      isActive: true
    }
  ];

  const insertedOrgs: InferInsertModel<typeof OrganizationTable>[] = [];
  for (const org of orgs) {
    const newOrg = await insertOrganization(db, org);
    insertedOrgs.push(newOrg);
    console.log(newOrg);
  }
  return insertedOrgs;
}

function generateUsers(roles: any, orgs: any) {
  const users: any[] = [];

  for (const org of orgs) {
    for (const role of roles) {
      if (role.roleName === 'Student') {
        continue;
      }
      users.push({
        email: `${role.roleName.toLowerCase().replace(/\s/g, '')}@${org.name.toLowerCase().replace(/\s/g, '')}.com`,
        name: `${org.name} ${role.roleName}`,
        role: role.id,
        contactPhoneNumber: {
          countryCode: 'IN',
          number: Math.floor(1000000000 + Math.random() * 9000000000).toString()
        },
        organization: org.id,
        isActive: true,
        sendEmail: false,
        givenUserId: `${org.name.replace(/\s/g, '').substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
        joiningDate: new Date(
          2024,
          Math.floor(Math.random() * 6),
          Math.floor(1 + Math.random() * 28)
        ).toISOString()
      });
    }
  }

  return users;
}

export async function createSampleUsers(
  roles?: InferInsertModel<typeof RoleTable>[],
  orgs?: InferInsertModel<typeof OrganizationTable>[]
) {
  if (!roles) {
    roles = await db.select().from(RoleTable).execute();
  }

  if (!orgs) {
    orgs = await db.select().from(OrganizationTable).execute();
  }

  const users = generateUsers(roles, orgs);

  for (const user of users) {
    const {
      email,
      name,
      role,
      contactPhoneNumber,
      organization,
      isActive,
      joiningDate,
      givenUserId
    }: any = user;
    await db.transaction(async (transactionClient) => {
      const password = generateRandomPassword();

      const [account] = await transactionClient
        .insert(LoginTable)
        .values({
          role,
          email,
          passwordHash: password,
          updatedAt: new Date().toISOString(),
          accountType: 'user'
        })
        .returning({ loginId: LoginTable.loginId });

      const user = await userService.createUser(transactionClient, {
        user: {
          name,
          contactPhoneNumber,
          isActive,
          joiningDate,
          loginId: account.loginId,
          givenUserId
        }
      });
      await userService.addUserToOrganization(transactionClient, {
        orgId: organization,
        userId: user.id
      });
    });
  }
}

export async function createSampleSemesters(orgs?: any, users?: any) {
  if (!users) {
    users = await db
      .select()
      .from(UserTable)
      .fullJoin(LoginTable, eq(UserTable.loginId, LoginTable.loginId))
      .fullJoin(RoleTable, eq(LoginTable.role, RoleTable.id))
      .execute();
  }

  if (!orgs) {
    orgs = await db.select().from(OrganizationTable).execute();
  }

  const mentors = users.filter((user: any) => user.role.roleName === 'Mentor');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  for (const org of orgs) {
    const randomizerYear = Math.floor(Math.random() * 4);
    const randomizerMonth = Math.floor(Math.random() * 12);
    const semester = {
      year: currentYear + randomizerYear,
      month:
        randomizerYear === 0
          ? currentMonth + Math.floor(Math.random() * (12 - currentMonth))
          : randomizerMonth,
      orgId: org.id
    };

    const batches: { mentorId: string }[] = [];
    const numberOfBatches = Math.floor(Math.random() * 4);
    for (let i = 0; i < numberOfBatches; i++) {
      const mentor = mentors[i];
      batches.push({
        mentorId: mentor.user.id
      });
    }

    // const mockRequest = {
    //   body: {
    //     year: semester.year,
    //     month: semester.month,
    //     orgId: semester.orgId,
    //     batches
    //   }
    // };

    // await createSemester(
    //   mockRequest as any,
    //   {
    //     status: () => {
    //       return { send: () => {} };
    //     }
    //   } as any,
    //   () => {}
    // );
    const {
      year,
      month,
      orgId
    }: {
      year: number;
      month: number;
      orgId: string;
    } = semester;
    await db.transaction(async (transactionClient) => {
      const { name: orgName } = await organizationService.getOrganizationById(
        { findValue: orgId },
        ['name'],
        transactionClient
      );
      const namedBatches: BatchInsert[] = createBatchObjectsWithBatchNames(
        year!,
        month!,
        orgName!,
        batches as any
      );
      const semester = await createSemesterService(
        {
          semester: {
            year,
            month,
            orgId
          },
          batches: namedBatches
        },
        transactionClient
      );
      console.log(semester);
    });
  }
}

function generateStudents(orgs: any, batches: any) {
  const students: any[] = [];

  for (const org of orgs) {
    for (const batch of batches) {
      const numberOfStudents = Math.floor(Math.random() * 6);
      for (let i = 0; i < numberOfStudents; i++) {
        students.push({
          personalEmail: `student${Math.floor(Math.random() * 1000000)}@${org.name.toLowerCase().replace(/\s/g, '')}.com`,
          name: `Student ${Math.floor(Math.random() * 100000)}`,
          apsche: Math.random() < 0.5,
          orgId: org.id,
          batchId: batch.batchId,
          contactPhoneNumber: {
            countryCode: 'IN',
            number: Math.floor(1000000000 + Math.random() * 9000000000).toString()
          },
          isActive: true,
          joiningDate: new Date(
            2024,
            Math.floor(Math.random() * 6),
            Math.floor(1 + Math.random() * 28)
          ).toISOString(),
          givenStudentId: `${org.name.replace(/\s/g, '').substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`
        });
      }
    }
  }

  return students;
}

async function getRoleIdByName(roleName: string, transactionClient: NodePgDatabase<Schema>) {
  const role = await transactionClient
    .select()
    .from(RoleTable)
    .where(eq(RoleTable.roleName, roleName))
    .execute();

  if (role.length > 0) {
    return role[0].id;
  } else {
    throw new Error(`Role ${roleName} not found`);
  }
}

export async function createSampleStudents(
  orgs?: InferInsertModel<typeof OrganizationTable>[],
  batches?: InferInsertModel<typeof BatchTable>[]
) {
  orgs = orgs ?? (await db.select().from(OrganizationTable).execute());
  batches = batches ?? (await db.select().from(BatchTable).execute());

  const students = generateStudents(orgs, batches);

  for (const student of students) {
    const {
      personalEmail,
      name,
      apsche,
      orgId,
      batchId,
      contactPhoneNumber,
      isActive,
      joiningDate,
      givenStudentId
    } = student;

    await db.transaction(async (transactionClient) => {
      const password = generateRandomPassword();
      const studentRoleId = await getRoleIdByName('Student', transactionClient);
      const [login] = await transactionClient
        .insert(LoginTable)
        .values({
          email: personalEmail,
          passwordHash: password,
          updatedAt: new Date().toISOString(),
          accountType: 'student',
          role: studentRoleId
        })
        .returning({ loginId: LoginTable.loginId });

      const birthYear = 2000 + Math.floor(Math.random() * 5);
      const birthMonth = Math.floor(Math.random() * 12);
      const birthDay = Math.floor(Math.random() * 28);

      await createStudent({
        transactionClient,
        student: {
          name,
          personalEmail,
          dateOfBirth: new Date(birthYear, birthMonth, birthDay),
          apsche,
          orgId,
          batchId,
          contactPhoneNumber,
          isActive,
          gender: Math.random() < 0.5 ? 'male' : 'female',
          joiningDate: joiningDate,
          givenStudentId,
          loginId: login.loginId,
          createdAt: new Date().toISOString()
        }
      });
    });
  }
}

type CourseInsertData = InferInsertModel<typeof CourseTable>;

export async function createSampleCourses() {
  const courses = generateRandomCourses();

  for (const course of courses) {
    await db.transaction(async (transactionClient) => {
      await transactionClient.insert(CourseTable).values(course);
    });
  }
}

function generateRandomCourses(): CourseInsertData[] {
  const courses: CourseInsertData[] = [];
  const numberOfCourses = 20;

  for (let i = 0; i < numberOfCourses; i++) {
    courses.push({
      courseId: crypto.randomUUID(), // Ensure courseId is provided if needed
      givenCourseId: `COURSE${Math.floor(1000 + Math.random() * 9000)}`,
      name: `Course ${Math.floor(Math.random() * 100000)}`,
      description: `Description for Course ${Math.floor(Math.random() * 100000)}`,
      skills: `Skill ${Math.floor(Math.random() * 1000)}, Skill ${Math.floor(Math.random() * 1000)}`,
      duration: Math.floor(10 + Math.random() * 90), // Duration between 10 and 100 hours
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return courses;
}

interface Program {
  name: string;
  isActive: boolean;
  givenProgramId: string;
  description: string;
  duration: number;
  skills: string;
  bannerBase64: string; // Ensure this is provided
  courseIds: string[];
  createdAt: string;
  updatedAt: string;
}

function generateBase64Banner(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAB0lEQVR42mP8/wcAAwAB/6H9VoAAAAABJRU5ErkJggg==';
}

function generateSamplePrograms(courseIds: string[]): Program[] {
  const programs: Program[] = [];
  const numberOfPrograms = 10;

  for (let i = 0; i < numberOfPrograms; i++) {
    const numberOfCourses = Math.floor(Math.random() * 5) + 1;
    const selectedCourseIds = courseIds.sort(() => 0.5 - Math.random()).slice(0, numberOfCourses);

    programs.push({
      name: `Sample Program ${Math.floor(Math.random() * 100000)}`,
      isActive: true,
      givenProgramId: `PRG${Math.floor(1000 + Math.random() * 9000)}`,
      description: `This is a sample program description for program ${Math.floor(Math.random() * 100000)}`,
      duration: Math.floor(Math.random() * 12) + 1, // Duration in months
      skills: `Skill ${Math.floor(Math.random() * 1000)}, Skill ${Math.floor(Math.random() * 1000)}`,
      bannerBase64: generateBase64Banner(),
      courseIds: selectedCourseIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  return programs;
}

export async function createSamplePrograms(): Promise<void> {
  const courses = await db.select({ courseId: CourseTable.courseId }).from(CourseTable).execute();

  const samplePrograms = generateSamplePrograms(courses.map((course) => course.courseId));

  for (const program of samplePrograms) {
    await db.transaction(async (transactionClient) => {
      try {
        const createdProgram = await programService.createProgram(
          {
            Program: {
              name: program.name,
              isActive: program.isActive,
              givenProgramId: program.givenProgramId,
              description: program.description,
              duration: program.duration,
              skills: program.skills,
              bannerBase64: program.bannerBase64 // Include base64 string
            }
          },
          transactionClient
        );

        const programId: string = createdProgram.programId!;

        if (program.courseIds.length > 0) {
          await programService.mapCoursesToProgram(programId, program.courseIds, transactionClient);
        }
      } catch (error) {
        logger.error(error);
        throw new ApiError(httpStatus.CONFLICT, 'Sample program not created');
      }
    });
  }
}

export async function createSampleData() {
  const roles = await createSampleRoles();
  const orgs = await createSampleOrgs();
  await createSampleUsers(roles, orgs);
  await createSampleCourses();
  await createSamplePrograms();

  for (let i = 0; i < 10; i++) {
    try {
      await createSampleSemesters(orgs);
    } catch (error) {
      // DO NOTHING
    }
  }
  await createSampleStudents();
}
