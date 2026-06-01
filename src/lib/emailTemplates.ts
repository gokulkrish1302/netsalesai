import type { ScoredAccount } from "./types";
import { formatCurrencyShort } from "./format";

type Tone = "Professional" | "Casual" | "Urgent";

function productsFor(account: ScoredAccount): string {
  if (account.cloudStatus === "active_cloud" || account.cloudStatus === "hybrid") {
    return "NetApp BlueXP, Cloud Volumes ONTAP, and Keystone Flex Subscription";
  }
  if (account.cloudStatus === "licensed_not_deployed") {
    return "NetApp BlueXP activation, ONTAP One, and Cloud Insights";
  }
  return "NetApp AFF C-Series, BlueXP, and Cloud Volumes ONTAP";
}

export function emailSubject(account: ScoredAccount): string {
  return `${account.accountName} — Your ${account.deviceModel} Infrastructure & Cloud Path Forward`;
}

export function emailBody(account: ScoredAccount, tone: Tone): string {
  const products = productsFor(account);
  const renewalHook =
    account.contractRenewalDays <= 60
      ? `With your support contract renewing in ${account.contractRenewalDays} days, this is the right moment to lock in a forward-looking architecture rather than a like-for-like renewal.`
      : `Looking ahead to your renewal in ${account.contractRenewalDays} days, we should start framing what the next-generation environment looks like.`;

  if (tone === "Professional") {
    return `Hi {First Name},

I've been reviewing the ${account.accountName} environment in Active IQ and wanted to share a few observations. Your ${account.deviceModel} has been in production for ${account.deviceAgeYears.toFixed(1)} years, and storage utilization is currently at ${account.utilizationPct}% — both indicators that a refresh and cloud-tiering conversation would be timely.

${renewalHook}

Based on what we're seeing, I'd recommend a short discovery session focused on ${products}. The goal: a 12-month roadmap that protects your ${formatCurrencyShort(account.itBudgetUSD)} infrastructure spend while unlocking cloud elasticity.

Would a 30-minute call next week work? Happy to align with your team's calendar.

Best,
{Your Name}
NetApp`;
  }
  if (tone === "Casual") {
    return `Hey {First Name},

Quick one — pulled up ${account.accountName} in Active IQ this morning. Your ${account.deviceModel} is running hot at ${account.utilizationPct}% utilization and it's been ${account.deviceAgeYears.toFixed(1)} years in service, so I wanted to reach out before things get tight.

${renewalHook}

I think there's a strong fit with ${products} for what you're trying to do. Nothing heavy — just a 30-min call to walk through what a smoother path forward could look like.

Got a window next week?

Cheers,
{Your Name}`;
  }
  // Urgent
  return `{First Name},

Flagging this directly: ${account.accountName}'s ${account.deviceModel} is ${account.deviceAgeYears.toFixed(1)} years old, storage is at ${account.utilizationPct}%, and your contract renews in ${account.contractRenewalDays} days. That's a narrow window to evaluate alternatives before you're locked into another term.

${renewalHook}

I'd strongly recommend we get on a 30-minute call this week. I'll bring a focused recommendation around ${products} and a clear migration sequence tied to your renewal date.

What does Thursday or Friday look like on your end?

{Your Name}
NetApp`;
}

export const EMAIL_TONES: Tone[] = ["Professional", "Casual", "Urgent"];
export type { Tone };
