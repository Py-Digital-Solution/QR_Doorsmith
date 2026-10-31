import "server-only";
import { waSend } from "@/services/whatsapp";

/**
 * Bilingual (Hindi + English) WhatsApp notifications for app events.
 *
 * Every function here is FIRE-AND-FORGET: it never throws and never blocks the
 * calling operation. Failures are logged by the shared WhatsApp sender.
 */

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  sales_rep: "Sales Rep",
  distributor: "Distributor",
  counter: "Counter",
  khati: "Karigar",
};

const APP_URL = "https://app.doorsmith.in";

function fire(phone: string | null | undefined, message: string, type: string) {
  if (!phone) return;
  waSend(phone, message, type).catch((e) => console.error(`[wa-notify] ${type} failed:`, e));
}

const nm = (name?: string | null) => (name ?? "").trim();

/** Redemption OTP → karigar (to show to the counter). */
export function notifyRedemptionOtp(phone: string | null | undefined, name: string | null | undefined, points: number, otp: string) {
  fire(
    phone,
    `🔐 *रिडेम्पशन OTP | Redemption OTP*\n\nनमस्ते ${nm(name)}, *${points}* अंक रिडीम करने के लिए आपका OTP है: *${otp}*\nHi ${nm(name)}, your OTP to redeem *${points}* points is: *${otp}*\n\nयह OTP काउंटर को दिखाएं। 30 मिनट में समाप्त। किसी और के साथ साझा न करें।\nShow this OTP to the counter. Expires in 30 minutes. Do not share it with anyone else.`,
    "redemption_otp",
  );
}

/** Stock dispatched → counter. */
export function notifyDispatchCreated(counterPhone: string | null | undefined, counterName: string | null | undefined, billNo: string, totalCodes: number) {
  fire(
    counterPhone,
    `📦 *नया डिस्पैच | Stock Dispatched*\n\nनमस्ते ${nm(counterName)}, आपके काउंटर पर स्टॉक भेजा गया है।\nHi ${nm(counterName)}, stock has been dispatched to your counter.\n\n🧾 *बिल | Bill:* ${billNo}\n🔢 *कुल कोड | Total codes:* ${totalCodes}`,
    "dispatch",
  );
}

/** Staff account created → new staff member. */
export function notifyStaffWelcome(phone: string | null | undefined, name: string | null | undefined, role: string, email: string) {
  const label = ROLE_LABEL[role] ?? "Staff";
  fire(
    phone,
    `🎉 *DoorSmith में स्वागत है | Welcome to DoorSmith*\n\nनमस्ते ${nm(name)}, आपका ${label} खाता बन गया है।\nHi ${nm(name)}, your ${label} account has been created.\n\n🔑 लॉगिन विवरण आपके ईमेल (${email}) पर भेजे गए हैं।\nYour login details have been sent to your email (${email}).\n\n🔗 लॉग इन करें | Log in: ${APP_URL}/login`,
    "welcome",
  );
}

/** Karigar linked to an additional counter → karigar. */
export function notifyKarigarLinked(phone: string | null | undefined, name: string | null | undefined, counterName: string) {
  fire(
    phone,
    `🔗 *नया काउंटर जुड़ा | Linked to a Counter*\n\nनमस्ते ${nm(name)}, अब आप *${counterName}* काउंटर से भी जुड़ गए हैं।\nHi ${nm(name)}, you are now also linked to *${counterName}*.\n\nआप इस काउंटर पर भी स्कैन करके अंक कमा सकते हैं।\nYou can now earn points by scanning at this counter too.`,
    "link",
  );
}

/** One-time direct access link for an active Carpenter. */
export function notifyKhatiAccessLink(
  phone: string | null | undefined,
  name: string | null | undefined,
  accessUrl: string,
) {
  fire(
    phone,
    `🔗 *DoorSmith सीधा लॉगिन लिंक | Direct Access Link*\n\nनमस्ते ${nm(name)}, आपका DoorSmith कारीगर खाता तैयार है। नीचे दिए लिंक पर क्लिक करके सीधे अपना कारीगर ऐप खोलें:\nHi ${nm(name)}, your DoorSmith Carpenter account is ready. Tap the link below to open your Carpenter app directly:\n\n${accessUrl}\n\nयह सुरक्षित लिंक एक बार इस्तेमाल किया जा सकता है और 7 दिनों में समाप्त हो जाएगा। इसे किसी के साथ साझा न करें।\nThis secure link can be used once and expires in 7 days. Do not share it with anyone.`,
    "welcome",
  );
}

/** Counter completed first-login KYC → notify admin. */
export function notifyCounterKycToAdmin(adminPhone: string | null | undefined, counterName: string) {
  fire(
    adminPhone,
    `🪪 *काउंटर KYC पूर्ण | Counter KYC Completed*\n\n*${nm(counterName)}* ने अपना KYC (फोटो + पता) पूरा कर लिया है।\n*${nm(counterName)}* has completed their KYC (photo + address).`,
    "kyc",
  );
}
