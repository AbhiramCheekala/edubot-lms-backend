import { sql } from 'drizzle-orm';
import express from 'express';
import { db } from '../../db/db.js';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { ConversationTable } from '../../db/schema/conversation.schema.js';
import { MessageTable } from '../../db/schema/message.schema.js';
import { ChatUserMetadataTable } from '../../db/schema/chatUserMetadata.schema.js';

// const readAssignment = guard(
//   or(
//     check(Actions.assignment.read, DataAccessScopes.admin.id),
//     check(Actions.assignment.read, DataAccessScopes.organization.id),
//     check(Actions.assignment.read, DataAccessScopes.supervisor.id),
//     check(Actions.assignment.read, DataAccessScopes.self.id)
//   )
// );

// const securityFilterParamsAssignmentRead: SecurityFilterParam[] = [
//   { identifier: 'assignmentReadScopes', action: Actions.assignment.read },
//   { identifier: 'submissionReadScopes', action: Actions.submission.read }
// ];

const router = express.Router();

router.route('/assignments/:assignmentId').get(verifyToken, async (req, res) => {
  const { assignmentId } = req.params;
  const assignmentDetails = await getAssignmentDetails(db, assignmentId);
  res.json(assignmentDetails);
});

router.route('/messages/:conversationId').get(
  // verifyToken,
  async (req, res) => {
    const { conversationId } = req.params;
    const messageDetails = await getMessageDetails(db, conversationId);
    res.json(messageDetails);
  }
);

router.route('/chat-user-metadata/:loginId').get(verifyToken, async (req, res) => {
  const { loginId } = req.params;
  if (loginId !== req.accountInfo?.loginId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const chatUserMetadata = await getChatUserMetadata(db, loginId);
  res.json(chatUserMetadata);
});

router.get('/conversations', verifyToken, async (req, res) => {
  // const user = req.headers['x-user'];
  const user = req.accountInfo?.loginId;
  const type = req.headers['x-type'];

  if (!user || !type) {
    return res.status(400).json({ error: 'Missing user or type' });
  }

  try {
    const conversations = await db.execute(sql`
      SELECT *
      FROM ${ConversationTable}
      WHERE ${ConversationTable.loginId} = ${user}
        AND ${ConversationTable.deleted} = false
        AND ${ConversationTable.type} = ${type}
      ORDER BY ${ConversationTable.createdAt} DESC
    `);

    res.status(200).json(conversations.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const prismaPlatformTypeEnumMappingReverse = {
  '26d149f5-76e0-40c8-bf48-2c41cf5b47cc': 'd149f5_76e0_40c8_bf48_2c41cf5b47cc',
  'c7e8fa0f-4496-4902-bdeb-d706678aadf0': 'c7e8fa0f_4496_4902_bdeb_d706678aadf0',
  '9e9c418b-265a-4be7-a992-bd72bbea528e': 'e9c418b_265a_4be7_a992_bd72bbea528e',
  'c5000ff5-e2cc-4fc1-8b3f-51786293259f': 'c5000ff5_e2cc_4fc1_8b3f_51786293259f'
} as const;

async function getAssignmentDetails(db: any, assignmentId: string) {
  const queryResults = await db.execute(sql`
    SELECT 
      a.assignment_id,
      a.created_at,
      a.updated_at,
      a.template_repository,
      a.platform_type,
      a.auto_grading,
      a.test_case_grading,
      a.module_section_id,
      ms.module_section_id AS ms_id,
      ms.name AS ms_name,
      ms.content_group_id,
      ms.section_type,
      ms.created_at AS ms_created_at,
      ms.updated_at AS ms_updated_at,
      msm.position AS msm_position,
      m.module_id,
      m.title AS module_title,
      m.summary AS module_summary,
      m.created_at AS module_created_at,
      m.updated_at AS module_updated_at,
      cmm.position AS cmm_position,
      c.course_id,
      c.name AS course_name,
      c.description AS course_description,
      c.skills AS course_skills,
      c.duration AS course_duration,
      c.is_active AS course_is_active,
      c.created_at AS course_created_at,
      c.updated_at AS course_updated_at,
      c.given_course_id AS course_given_course_id
    FROM 
      assignment a
    LEFT JOIN 
      module_section ms ON a.module_section_id = ms.module_section_id
    LEFT JOIN 
      module_section_mapper msm ON ms.module_section_id = msm.module_section_id
    LEFT JOIN 
      module m ON msm.module_id = m.module_id
    LEFT JOIN 
      course_module_mapper cmm ON m.module_id = cmm.module_id
    LEFT JOIN 
      course c ON cmm.course_id = c.course_id
    WHERE 
      a.assignment_id = ${assignmentId}
  `);

  const results = queryResults.rows;
  if (results.length === 0) {
    return null;
  }

  // Process the results to match the original nested structure
  const assignment = {
    assignment_id: results[0].assignment_id,
    created_at: results[0].created_at,
    updated_at: results[0].updated_at,
    template_repository: results[0].template_repository,
    platform_type:
      prismaPlatformTypeEnumMappingReverse[
        results[0].platform_type as keyof typeof prismaPlatformTypeEnumMappingReverse
      ],
    auto_grading: results[0].auto_grading,
    test_case_grading: results[0].test_case_grading,
    module_section_id: results[0].module_section_id,
    module_section: {
      module_section_id: results[0].ms_id,
      created_at: results[0].ms_created_at,
      updated_at: results[0].ms_updated_at,
      name: results[0].ms_name,
      content_group_id: results[0].content_group_id,
      section_type: results[0].section_type,
      module_section_mapper: results.map((r: any) => ({
        position: r.msm_position,
        module_id: r.module_id,
        module_section_id: r.ms_id,
        module: {
          module_id: r.module_id,
          created_at: r.module_created_at,
          updated_at: r.module_updated_at,
          title: r.module_title,
          summary: r.module_summary,
          course_module_mapper: r.course_id
            ? [
                {
                  position: r.cmm_position,
                  course_id: r.course_id,
                  module_id: r.module_id,
                  course: {
                    course_id: r.course_id,
                    created_at: r.course_created_at,
                    updated_at: r.course_updated_at,
                    given_course_id: r.course_given_course_id,
                    name: r.course_name,
                    description: r.course_description,
                    skills: r.course_skills,
                    duration: r.duration,
                    is_active: r.course_is_active
                  }
                }
              ]
            : []
        }
      }))
    }
  };

  return assignment;
}

async function getMessageDetails(db: any, conversationId: string) {
  try {
    const messages = await db.execute(sql`
      SELECT *
      FROM ${MessageTable}
      WHERE ${MessageTable.conversationId} = ${conversationId}
      ORDER BY ${MessageTable.createdAt} ASC
    `);

    return messages.rows;
  } catch (err) {
    console.error('Error fetching message details:', err);
    throw err;
  }
}

async function getChatUserMetadata(db: any, loginId: string) {
  const queryResults = await db.execute(sql`
    SELECT *
    FROM ${ChatUserMetadataTable}
    WHERE ${ChatUserMetadataTable.loginId} = ${loginId}
  `);
  return queryResults.rows;
}

export default router;
