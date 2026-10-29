import { createListRoute } from "@/lib/api/createCrudRoutes";
import { toClientPolicy } from "@/lib/forms/clientPolicy";
import { createPolicySchema, policiesRepository } from "@/lib/sheets/policies";
import { CACHE_TAGS } from "@/lib/sheets/cached";

// The policy number is cut to its last four characters before it leaves the server.
export const { GET, POST } = createListRoute(policiesRepository, CACHE_TAGS.policies, createPolicySchema, toClientPolicy);
