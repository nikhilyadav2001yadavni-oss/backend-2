import Joi from 'joi'

export const createSupportTicketBodySchema = Joi.object({
    subject: Joi.string().trim().min(3).max(200).required(),
    message: Joi.string().trim().min(1).max(5000).required(),
})

export const sendSupportMessageBodySchema = Joi.object({
    message: Joi.string().trim().min(1).max(10000).required(),
    attachmentUrls: Joi.array().items(Joi.string().uri().max(2048)).max(10).optional().default([]),
})
