import httpStatus from 'http-status';
import logger from '../config/logger.js';
import { db } from '../db/db.js';
import { ContactPhoneNumber, OrganizationSearchColumn, OrgSortColumn } from '../db/schema/index.js';
import organizationService from '../services/organization.service.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import {
  FilterField,
  parseQuery,
  QueryField,
  ValidFieldType
} from '../utils/helpers/parseFindAllQuery.js';

const orgFilterFields: FilterField<string | boolean>[] = [
  { field: 'name', type: 'string' },
  { field: 'givenOrgId', type: 'string' },
  { field: 'email', type: 'string' }
];

const orgSortFields: QueryField<string>[] = [
  { field: 'name', type: 'string' },
  { field: 'joiningDate', type: 'string' }
];

interface organizationQueryParams {
  includeStudentCount: boolean;
  includeBatchCount: boolean;
}

const getOrganizations = catchAsync(async (req, res) => {
  const { includeStudentCount, includeBatchCount } =
    req.query as unknown as organizationQueryParams;
  const parsedFindParams = parseQuery<
    OrganizationSearchColumn,
    OrgSortColumn,
    ValidFieldType,
    ValidFieldType
  >(req, orgFilterFields, orgSortFields);

  const options = {
    includeStudentCount,
    includeBatchCount,
    ...parsedFindParams,
    securityFilters: req.securityFilters
  };
  const keys = undefined;
  const transactionClient = undefined;
  const result = await organizationService.queryOrganizations(options, keys, transactionClient);
  res.send(result);
});

const getOrganization = catchAsync(async (req, res) => {
  const transactionClient = undefined;
  const { includeStudentCount, includeBatchCount } =
    req.query as unknown as organizationQueryParams;
  const organization = await organizationService.getOrganizationById(
    {
      findValue: req.params.orgId,
      includeStudentCount,
      includeBatchCount,
      securityFilters: req.securityFilters
    },
    undefined,
    transactionClient
  );
  if (!organization) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }
  res.send(organization);
});

const createOrganization = catchAsync(async (req, res) => {
  const {
    email,
    name,
    contactPhoneNumber,
    givenOrgId,
    isActive,
    state,
    address,
    pincode,
    githubOrgUri
  }: {
    email: string;
    name: string;
    role: string;
    contactPhoneNumber: ContactPhoneNumber;
    givenOrgId: string;
    isActive: boolean;
    state: string;
    address: string;
    pincode: string;
    githubOrgUri: string;
  } = req.body;
  await db.transaction(async (transactionClient) => {
    try {
      const user = await organizationService.createOrganization(
        {
          Organization: {
            email,
            name,
            contactPhoneNumber,
            isActive,
            givenOrgId,
            state,
            address,
            pincode,
            githubOrgUri
          }
        },
        transactionClient
      );

      res.status(httpStatus.CREATED).send(user);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'Organization not created');
    }
  });
});

const updateOrganization = catchAsync(async (req, res) => {
  const {
    email,
    name,
    givenOrgId,
    isActive,
    state,
    address,
    pincode,
    contactPhoneNumber,
    githubOrgUri
  }: {
    email: string;
    name: string;
    role: string;
    contactPhoneNumber: ContactPhoneNumber;
    givenOrgId: string;
    isActive: boolean;
    state: string;
    address: string;
    pincode: string;
    githubOrgUri: string;
  } = req.body;
  await db.transaction(async (transactionClient) => {
    try {
      const org = await organizationService.updateOrgById(req.params.orgId, transactionClient, {
        org: {
          email,
          name,
          givenOrgId,
          isActive,
          state,
          address,
          pincode,
          contactPhoneNumber,
          githubOrgUri
        }
      });

      res.status(httpStatus.ACCEPTED).send(org);
    } catch (error) {
      logger.error(error);
      try {
        await transactionClient.rollback();
      } catch (e) {}
      throw new ApiError(httpStatus.CONFLICT, 'User not updated');
    }
  });
});

export default {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization
};
