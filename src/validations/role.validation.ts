import Joi from 'joi';

export const getRoles = {
  query: Joi.object().keys({})
};

export const getRole = {
  params: Joi.object().keys({
    roleId: Joi.string().guid().required()
  })
};
