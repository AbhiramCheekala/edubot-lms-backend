import Joi from 'joi';

export const findBinaryObject = {
  params: Joi.object().keys({
    binaryObjectId: Joi.string().guid().required()
  }),
  query: Joi.object().keys({
    includeSecuredFileUrl: Joi.boolean()
  })
};
