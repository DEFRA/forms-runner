import Joi from 'joi'

export const crumbSchema = Joi.string().optional().allow('')
