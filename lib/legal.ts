/** The Terms and the Privacy Policy, as data.
 *
 *  Text rather than a WebView pointing at a marketing site: these have to be
 *  readable on a plane, and a policy that only exists behind a network call is
 *  one a member cannot check at the moment they doubt something.
 *
 *  IMPORTANT — this is a working draft written from what the software actually
 *  does, not advice, and it has not been through a lawyer. Australian Consumer
 *  Law and the Privacy Act 1988 (APPs) both apply to a marketplace operating
 *  here, and the sections marked below are the ones a practitioner should look
 *  at before this ships to the stores. `LAST_REVIEWED` is what the screens
 *  display; move it when the text changes, not when the code around it does.
 */
export const LAST_REVIEWED = "3 September 2026";
export const LEGAL_CONTACT = "support@grailcard.com.au";

export type Section = { heading: string; body: string[] };

export const TERMS: Section[] = [
  {
    heading: "What GrailCard is",
    body: [
      "GrailCard is a marketplace for trading cards in Australia. We help you identify a card, see what cards like it have sold for, and buy or sell with other members.",
      "We are not a party to any sale. When you buy a card here, the contract is between you and the seller. We provide the place, the identity checks and the record — not the card.",
      "We do not grade cards. Where we show a grade, we are reading the grade a grading company already assigned, off the label on the slab.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "You need to be 18 or over to hold an account, and you must give us details that are true.",
      "One person, one account. You are responsible for what happens under yours, so keep your password to yourself and turn on two-step verification if your collection is worth something to somebody else.",
      "Selling requires an identity check. That check is what makes the rest of the marketplace worth trusting, and it is why the requirements get stricter as the amounts get larger.",
      "We may suspend an account that is being used to defraud, harass or evade the rules. Where we can, we will tell you why.",
    ],
  },
  {
    heading: "Prices and estimates",
    body: [
      "Every price we show is an estimate built from sales and listings we can see. It carries a confidence and the number of data points behind it, and you should read both.",
      "An estimate is not an appraisal, a valuation or a promise. It is our best reading of a market that moves, and on a thin market it can be wrong.",
      "Where we cannot say something honestly, we say we do not know rather than guessing. Treat a missing number as information.",
    ],
  },
  {
    heading: "Selling",
    body: [
      "List only cards you own and are able to send. Describe them accurately, including damage, and photograph what you are actually selling — not a stock image.",
      "A listing goes through a check before it appears. We can decline or remove one, and we will tell you why.",
      "When you accept an offer you are agreeing to sell at that price. Send the card promptly and packed so it survives the post.",
      "You are responsible for your own tax. If you sell regularly or at volume, that may include GST and income tax — that is between you and the ATO.",
    ],
  },
  {
    heading: "Buying",
    body: [
      "Read the description and the photographs. Ask the seller before you commit rather than after.",
      "Your rights under the Australian Consumer Law apply to a business seller and cannot be signed away by anything on this screen.",
      "If something goes wrong, open a dispute from the sale. Both sides get to put their case, with evidence, before anyone decides anything.",
    ],
  },
  {
    heading: "Keeping it on the platform",
    body: [
      "Do not move a deal to a phone number, an email or another app. We hide contact details in messages and listings for exactly this reason: a deal that leaves here is one nobody can help you with.",
      "Do not post links in messages. It is the shortest route from a marketplace to a phishing page.",
      "Community posts are yours, and you keep them. By posting you let us show them in the app.",
    ],
  },
  {
    heading: "What we do not promise",
    body: [
      "We do not promise the service will be uninterrupted, that a scan will identify every card, or that an estimate will match what you get.",
      "Nothing here limits rights you have under Australian law that cannot be limited — including the consumer guarantees.",
      // NOTE(legal): a liability cap belongs here. Drafting one is not
      // something this file should invent, so it is deliberately absent
      // rather than wrong.
    ],
  },
  {
    heading: "Changes",
    body: [
      "We will tell you in the app before a change to these terms that affects you takes effect. If you keep using GrailCard afterwards, the new terms apply.",
      `Questions about any of this: ${LEGAL_CONTACT}.`,
    ],
  },
];

export const PRIVACY: Section[] = [
  {
    heading: "The short version",
    body: [
      "We collect what we need to run a marketplace where people can trust each other, and no more. We do not sell your personal information.",
      "The two sensitive things we hold are your identity documents and your photographs. Both are explained below.",
    ],
  },
  {
    heading: "What we collect",
    body: [
      "Your account: name, email address, phone number, and a password we store scrambled — we cannot read it and neither can anybody who takes a copy of our database.",
      "Your identity: when you verify, our identity provider checks your document and tells us the result. Where the document itself is retained, it is retained by them under their own policy, not stored alongside your listings.",
      "Your activity: cards you scan, your collection, listings, offers, messages, community posts, ratings and disputes.",
      "Your device: the app records errors and rough usage so we can find what is broken. This does not include the contents of your messages.",
    ],
  },
  {
    heading: "Photographs",
    body: [
      "Photographs of a card you list are shown publicly, because that is what a listing is.",
      "Photographs you attach to a dispute are shown to the other party to the deal and to whoever reviews it — not publicly.",
      "A scan photograph is used to identify the card, and to improve identification. Do not photograph anything you would not want us to hold.",
    ],
  },
  {
    heading: "Who else sees it",
    body: [
      "Other members see your display name, your avatar, your ratings, your public listings and your community posts. They do not see your email address, your phone number or your identity documents.",
      "Someone you are dealing with sees what you send them in messages, and we hide contact details in those messages by default.",
      "Our suppliers see what they need to do their job: identity verification, payment processing, cloud hosting, email delivery, push notifications and error reporting. They are bound to use it only for that.",
      "We will hand over information where the law requires it, and we will tell you unless we are prevented from doing so.",
    ],
  },
  {
    heading: "Where it lives, and for how long",
    body: [
      "Our servers and our file storage are in Australia where we can put them there, and some suppliers operate overseas — which means some of your information is handled outside Australia.",
      "We keep account and transaction records while your account is open and for a period afterwards, because a sales record is what makes a dispute answerable and a price honest.",
      "Sales history is kept permanently, but without anything identifying you attached to it.",
    ],
  },
  {
    heading: "What you can ask us to do",
    body: [
      "Ask for a copy of what we hold about you.",
      "Ask us to correct something wrong.",
      "Ask us to delete your account. Some records survive that — a completed sale, and anything we are required to keep — but they stop being connected to you.",
      "Turn off push notifications, from your device settings or from within the app.",
      `Any of these: ${LEGAL_CONTACT}. If we get it wrong, you can complain to the Office of the Australian Information Commissioner.`,
    ],
  },
  {
    heading: "Security",
    body: [
      "Passwords are hashed with scrypt. Session tokens are signed. Uploads go straight to storage over signed, short-lived URLs rather than through our servers.",
      "None of that makes a breach impossible. If one happens and it is likely to cause you serious harm, we will tell you and the Commissioner, as the law requires.",
    ],
  },
];
