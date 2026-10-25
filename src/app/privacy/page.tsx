import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${brand.name} collects about creators and visitors, why, who processes it, and how to access or delete your data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      current="/privacy"
      title="Privacy Policy"
      intro={`This policy explains what personal data ${brand.name} collects, why we use it, who helps us process it, and the choices you have. It covers people who create an account (“creators”) and people who visit a page or link made with ${brand.name} (“visitors”). We collect as little as we can, and we never sell personal data.`}
    >
      <h2>1. Who is responsible</h2>
      <p>
        {brand.name} ({brand.domain}) is responsible for the data described here. Contact us at{" "}
        <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> for any privacy question or request.
      </p>

      <h2>2. Data about creators</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email address, a securely hashed password (we never see the password itself), or your Google account’s name, email and picture
          if you sign in with Google.
        </li>
        <li>
          <strong>Your pages and links:</strong> names, bios, photos you upload, links, colours, custom domains and settings. Most of this is public by design, because
          you publish it.
        </li>
        <li>
          <strong>Billing:</strong> your plan, its status and renewal date. Card details are entered on Paddle’s checkout and never reach our servers; we only receive
          the payment result. For crypto payments we keep the amount, coin and payment status.
        </li>
        <li>
          <strong>Affiliate program:</strong> who referred you, your referral code, the payout email you give us, and the commissions you earn.
        </li>
        <li>
          <strong>Support:</strong> what you send us by email.
        </li>
      </ul>

      <h2>3. Data about visitors</h2>
      <p>When someone opens a page or link made with {brand.name}, we record anonymous statistics so the creator can see how it performs:</p>
      <ul>
        <li>the page or link visited, the time, and which link was clicked;</li>
        <li>country (from the network, not precise location), device type, operating system and browser;</li>
        <li>the website or app the visitor came from (for example Instagram or TikTok);</li>
        <li>
          a visitor code made by hashing the IP address and browser with a secret that changes every day. It lets us count unique visitors for one day without storing
          the IP address and without following anyone across days or sites.
        </li>
      </ul>
      <p>
        Visitors can also send a report about a page. A report contains the reason, any text the visitor writes, and the same daily visitor code. Creators see totals and
        breakdowns, never who an individual visitor is.
      </p>

      <h2>4. Cookies and local storage</h2>
      <ul>
        <li>
          <strong>Sign-in cookie</strong> (creators only): keeps you signed in. Required for the dashboard.
        </li>
        <li>
          <strong>Referral cookie:</strong> set when someone opens an affiliate link, so the referrer gets credit if an account is created. It expires after 60 days.
        </li>
        <li>
          <strong>Current page cookie</strong> (creators only): remembers which of your bio pages you were editing.
        </li>
        <li>
          <strong>Local storage</strong> in your browser for small preferences, such as whether you have already seen the welcome screen or which age warning you
          confirmed.
        </li>
      </ul>
      <p>We don’t use advertising cookies or third-party tracking pixels on {brand.name} pages.</p>

      <h2>5. Why we use the data</h2>
      <ul>
        <li>to provide the Service you signed up for: your account, pages, links and statistics (performance of a contract);</li>
        <li>to take payments, renew or cancel plans and pay affiliate commissions (contract and legal obligations such as tax records);</li>
        <li>to keep the Service safe: preventing spam, abuse, fraud and bots, and handling reports (legitimate interest);</li>
        <li>to send you emails you need, such as email confirmation, password resets and important changes (contract).</li>
      </ul>

      <h2>6. Who processes data for us</h2>
      <p>We share data only with companies that help us run {brand.name}, and only what they need:</p>
      <ul>
        <li>
          <strong>Vercel</strong> (hosting and delivery of the website);
        </li>
        <li>
          <strong>Neon</strong> (database hosting);
        </li>
        <li>
          <strong>Paddle</strong> (card payments, tax and invoices, as Merchant of Record; see{" "}
          <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noreferrer">
            Paddle’s privacy notice
          </a>
          );
        </li>
        <li>
          <strong>NOWPayments</strong> (crypto payments);
        </li>
        <li>
          <strong>Google</strong> (only if you choose “Sign in with Google”);
        </li>
        <li>
          <strong>Our email provider</strong> (to deliver account emails).
        </li>
      </ul>
      <p>
        Some of these providers are outside your country, including in the United States and the European Union. They are bound to protect the data and use it only to
        provide their service to us. We may also disclose data if the law requires it or to protect people from harm.
      </p>

      <h2>7. How long we keep data</h2>
      <ul>
        <li>Account and page data: until you delete it or your account.</li>
        <li>Visitor statistics: while the page or link exists. Detailed bio page records are reduced to daily totals after about 13 months.</li>
        <li>Payment and invoice records: as long as tax and accounting law requires.</li>
        <li>Backups: deleted data can remain in backups for a short time before they are overwritten.</li>
      </ul>

      <h2>8. Your rights</h2>
      <p>
        Depending on where you live (for example under the GDPR in Europe or Morocco’s law 09-08), you can ask to access, correct, export or delete your personal data,
        and object to or restrict how we use it. You can edit or delete most data yourself in the dashboard, and delete your whole account in Settings. For anything
        else, email <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>; we answer within 30 days. You can also complain to your data protection
        authority.
      </p>
      <p>
        Visitors: we can’t link statistics to you because we don’t store IP addresses. If you are a visitor and have a question, contact the creator of the page or
        email us.
      </p>

      <h2>9. Security</h2>
      <p>
        We use HTTPS everywhere, hash passwords, keep payment data with our payment providers, and limit who can access the database. No system is perfectly secure,
        so please use a strong, unique password.
      </p>

      <h2>10. Children</h2>
      <p>{brand.name} accounts are for people aged 18 or older. We don’t knowingly collect data from children; if you think a child has an account, tell us and we will delete it.</p>

      <h2>11. Changes</h2>
      <p>If we change this policy in an important way, we will tell creators by email or in the dashboard before the change applies.</p>
    </LegalPage>
  );
}
