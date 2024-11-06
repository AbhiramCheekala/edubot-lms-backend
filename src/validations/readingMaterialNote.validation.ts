import Joi from 'joi';

export const putNoteValidation = {
  params: Joi.object().keys({
    contentId: Joi.string().uuid().required()
  }),
  body: Joi.object().keys({
    note: Joi.string().required()
  })
};

export const getNotesValidation = {
  params: Joi.object().keys({
    contentId: Joi.string().uuid().required()
  })
};
