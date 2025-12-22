import * as mockApi from '../../shared/lib/mockApi';

export const login = mockApi.login;
export const registerTenant = mockApi.registerTenant;
export const logoutSession = mockApi.logoutSession;
export const logoutOtherSessions = mockApi.logoutOtherSessions;
export const getMySessions = mockApi.getMySessions;
export const validateSession = mockApi.validateSession;
export const bootstrapSession = mockApi.bootstrapSession;
export type RegisterPayload = mockApi.RegisterPayload;
