import "server-only";
import { waSend } from "@/services/whatsapp";

/**
 * Bilingual (Hindi + English) WhatsApp notifications for app events.
 *
 * Every function here is FIRE-AND-FORGET: it never throws and never blocks the
 * calling operation. If WhatsApp is down a scan/return/redemption still succeeds;
 * the failure is logged (and surfaced via the existing WaLog + email alert path
 * inside waSend()).
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

/** 1. Karigar earned points on a scan. */
export function notifyScanEarned(phone: string | null | undefined, name: string | null | undefined, points: number, balance: number) {
  fire(
    phone,
    `🎉 *अंक मिले | Points earned*\n\nनमस्ते ${nm(name)}, आपको *${points}* अंक मिले हैं।\nHi ${nm(name)}, you earned *${points}* points.\n\n💰 *कुल शेष | Balance:* ${balance}`,
    "scan",
  );
}

/** 2. Points reversed from a karigar due to a return. */
export function notifyReturnReversed(phone: string | null | undefined, name: string | null | undefined, points: number, balance: number, counterName: string) {
  fire(
    phone,
    `↩️ *अंक वापस | Points reversed*\n\nनमस्ते ${nm(name)}, ${counterName} पर वापसी के कारण *${points}* अंक काटे गए।\nHi ${nm(name)}, *${points}* points were reversed due to a return at ${counterName}.\n\n💰 *कुल शेष | Balance:* ${balance}`,
    "return",
  );
}

/** 3. New redemption request → notify the counter. */
export function notifyRedemptionRequested(counterPhone: string | null | undefined, counterName: string, khatiName: string, points: number) {
  fire(
    counterPhone,
    `🎁 *नई रिडेम्पशन अनुरोध | New Redemption Request*\n\nनमस्ते ${nm(counterName)}, ${nm(khatiName)} ने *${points}* अंक रिडीम करने का अनुरोध किया है।\nHi ${nm(counterName)}, ${nm(khatiName)} has requested to redeem *${points}* points.\n\nकृपया DoorSmith पर समीक्षा करें।\nPlease review it on DoorSmith.`,
    "redemption",
  );
}

/** 4. Redemption OTP → karigar (to show to the counter). */
export function notifyRedemptionOtp(phone: string | null | undefined, name: string | null | undefined, points: number, otp: string) {
  fire(
    phone,
    `🔐 *रिडेम्पशन OTP | Redemption OTP*\n\nनमस्ते ${nm(name)}, *${points}* अंक रिडीम करने के लिए आपका OTP है: *${otp}*\nHi ${nm(name)}, your OTP to redeem *${points}* points is: *${otp}*\n\nयह OTP काउंटर को दिखाएं। 30 मिनट में समाप्त। किसी और के साथ साझा न करें।\nShow this OTP to the counter. Expires in 30 minutes. Do not share it with anyone else.`,
    "redemption_otp",
  );
}

/** 5. Redemption approved/settled → karigar. */
export function notifyRedemptionApproved(phone: string | null | undefined, name: string | null | undefined, points: number, balance: number) {
  fire(
    phone,
    `✅ *रिडेम्पशन पूर्ण | Redemption Complete*\n\nनमस्ते ${nm(name)}, आपके *${points}* अंक सफलतापूर्वक रिडीम हो गए।\nHi ${nm(name)}, *${points}* points were successfully redeemed.\n\n💰 *शेष अंक | Balance:* ${balance}`,
    "redemption",
  );
}

/** 6. Redemption rejected → karigar. */
export function notifyRedemptionRejected(phone: string | null | undefined, name: string | null | undefined, points: number) {
  fire(
    phone,
    `❌ *रिडेम्पशन अस्वीकृत | Redemption Rejected*\n\nनमस्ते ${nm(name)}, आपका *${points}* अंक का रिडेम्पशन अनुरोध अस्वीकृत कर दिया गया।\nHi ${nm(name)}, your redemption request for *${points}* points was rejected.\n\nअधिक जानकारी के लिए अपने काउंटर से संपर्क करें।\nPlease contact your counter for details.`,
    "redemption",
  );
}

/** 7. Stock dispatched → counter. */
export function notifyDispatchCreated(counterPhone: string | null | undefined, counterName: string | null | undefined, billNo: string, totalCodes: number) {
  fire(
    counterPhone,
    `📦 *नया डिस्पैच | Stock Dispatched*\n\nनमस्ते ${nm(counterName)}, आपके काउंटर पर स्टॉक भेजा गया है।\nHi ${nm(counterName)}, stock has been dispatched to your counter.\n\n🧾 *बिल | Bill:* ${billNo}\n🔢 *कुल कोड | Total codes:* ${totalCodes}`,
    "dispatch",
  );
}

/** 8. Staff account created → new staff member. */
export function notifyStaffWelcome(phone: string | null | undefined, name: string | null | undefined, role: string, email: string) {
  const label = ROLE_LABEL[role] ?? "Staff";
  fire(
    phone,
    `🎉 *DoorSmith में स्वागत है | Welcome to DoorSmith*\n\nनमस्ते ${nm(name)}, आपका ${label} खाता बन गया है।\nHi ${nm(name)}, your ${label} account has been created.\n\n🔑 लॉगिन विवरण आपके ईमेल (${email}) पर भेजे गए हैं।\nYour login details have been sent to your email (${email}).\n\n🔗 लॉग इन करें | Log in: ${APP_URL}/login`,
    "welcome",
  );
}

/** 9. Karigar linked to an additional counter → karigar. */
export function notifyKarigarLinked(phone: string | null | undefined, name: string | null | undefined, counterName: string) {
  fire(
    phone,
    `🔗 *नया काउंटर जुड़ा | Linked to a Counter*\n\nनमस्ते ${nm(name)}, अब आप *${counterName}* काउंटर से भी जुड़ गए हैं।\nHi ${nm(name)}, you are now also linked to *${counterName}*.\n\nआप इस काउंटर पर भी स्कैन करके अंक कमा सकते हैं।\nYou can now earn points by scanning at this counter too.`,
    "link",
  );
}

/** 10. Account suspended or reactivated → the user. */
export function notifyAccountStatus(phone: string | null | undefined, name: string | null | undefined, status: string) {
  if (status === "suspended") {
    fire(
      phone,
      `⛔ *खाता निलंबित | Account Suspended*\n\nनमस्ते ${nm(name)}, आपका DoorSmith खाता निलंबित कर दिया गया है।\nHi ${nm(name)}, your DoorSmith account has been suspended.\n\nसहायता के लिए संपर्क करें।\nPlease contact support for assistance.`,
      "account_status",
    );
  } else if (status === "active") {
    fire(
      phone,
      `✅ *खाता सक्रिय | Account Active*\n\nनमस्ते ${nm(name)}, आपका DoorSmith खाता सक्रिय है। अब आप लॉग इन कर सकते हैं।\nHi ${nm(name)}, your DoorSmith account is active. You can log in now.`,
      "account_status",
    );
  }
}

/** 11. Counter completed first-login KYC → notify admin. */
export function notifyCounterKycToAdmin(adminPhone: string | null | undefined, counterName: string) {
  fire(
    adminPhone,
    `🪪 *काउंटर KYC पूर्ण | Counter KYC Completed*\n\n*${nm(counterName)}* ने अपना KYC (फोटो + पता) पूरा कर लिया है।\n*${nm(counterName)}* has completed their KYC (photo + address).`,
    "kyc",
  );
}
