import { VideoQueryDto } from 'src/modules/cms/video/dto/video-query.dto';

/**
 * VideoQueryDto already includes page/limit (via PaginationQueryDto), unlike its
 * Faq/CmsPage/Banner siblings — no extension needed here, kept as its own type for symmetry
 * with the other Admin*QueryDto wrappers in this folder.
 */
export class AdminVideoQueryDto extends VideoQueryDto {}
