import { SocialUserInfo } from "./social-user-info";

export class TwitterUserInfo implements SocialUserInfo {
    readonly avatarUrl: string;
    readonly id: string;
    readonly name: string;
    readonly screenName: string;
}