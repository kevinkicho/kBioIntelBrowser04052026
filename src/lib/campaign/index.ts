/** Campaign workspace barrel — templates, stage progress, last path, done map. */
export {
  CAMPAIGN_TEMPLATES,
  campaignTemplateById,
  campaignTemplatesByPersona,
  type CampaignPersona,
  type CampaignStage,
  type CampaignStageId,
  type CampaignWorkspaceTemplate,
} from './campaignWorkspace'
export {
  STAGE_EVENT_RULES,
  CAMPAIGN_PROGRESS_EVENT_NAMES,
  autoCompletedStagesFromEvents,
  mergeCampaignStageProgress,
  campaignProgressPercent,
  type StageDoneSource,
  type StageProgressEvent,
  type StageProgressResult,
} from './campaignStageProgress'
export {
  LAST_CAMPAIGN_PATH_KEY,
  loadLastCampaignPath,
  saveLastCampaignPath,
  clearLastCampaignPath,
  type LastCampaignPath,
} from './lastCampaignPath'
export {
  CAMPAIGN_DONE_KEY,
  loadCampaignDoneMap,
  saveCampaignDoneMap,
} from './campaignDoneStorage'
