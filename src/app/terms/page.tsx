import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { brand } from "@/config/brand";
import { PRICES_USD } from "@/lib/plan-rules";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The rules for using ${brand.name}: accounts, acceptable use, the Pro plan, payments through Paddle, and our responsibilities.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      current="/terms"
      title="Terms of Service"
      intro={`These terms are an agreement between you and ${brand.name} (“${brand.name}”, “we”, “us”) for using the website ${brand.domain} and everything on it: bio pages, Two-Steps pages, deep links, custom domains, analytics and the affiliate program (together, the “Service”). By creating an account or using the Service you agree to these terms. If you don’t agree, please don’t use the Service.`}
    >
      <h2>1. Who can use ViewLink</h2>
      <p>
        You must be at least 18 years old, or the age of majority where you live if that is higher, to create an account. If you use {brand.name} for a business, you
        confirm that you are allowed to accept these terms on its behalf.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>Give a real email address and keep your password safe. You are responsible for everything done with your account.</li>
        <li>Tell us right away at <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> if you think someone else is using it.</li>
        <li>You can delete your account at any time in Settings. This deletes your pages, links, uploads and stats.</li>
      </ul>

      <h2>3. Your content</h2>
      <p>
        You keep all rights to what you put on {brand.name} (names, photos, texts, links). You give us a worldwide, non-exclusive, royalty-free licence to host, store,
        resize, display and serve that content only so we can run the Service for you, for example to show your public page to visitors. This licence ends when you
        delete the content or your account, except for copies kept for a limited time in backups.
      </p>
      <p>You confirm that you own your content or have permission to use it, and that it does not break any law or anyone else’s rights.</p>

      <h2>4. Acceptable use</h2>
      <p>You may not use {brand.name} to:</p>
      <ul>
        <li>share or link to anything illegal, including any sexual content involving minors, which we report to the authorities;</li>
        <li>link to age-restricted content without turning on the 18+ warning, or where that content is not legal for you or your visitors;</li>
        <li>phish, spread malware, run scams, or send people to pages that steal passwords or payment details;</li>
        <li>send spam, or impersonate a person, brand or organisation;</li>
        <li>promote violence, hate or harassment against people or groups;</li>
        <li>infringe copyright, trademarks or other rights;</li>
        <li>break, overload, scrape or get around the security or limits of the Service, or resell it without our written permission.</li>
      </ul>
      <p>
        Visitors can report a page with the Report button. We may review reports and, if something breaks these rules, remove content, turn off links or pages, or
        suspend or close the account, with or without notice depending on how serious it is.
      </p>

      <h2>5. Free and Pro plans</h2>
      <p>
        {brand.name} has a free plan and a paid Pro plan (currently US${PRICES_USD.monthly} per month or US${PRICES_USD.yearly} per year, plus any tax shown at
        checkout). What each plan includes is shown on the <Link href="/#pricing">pricing</Link> and billing pages. We may change features or prices in the future; a
        price change for an existing subscription applies from your next renewal, and we tell you before it does.
      </p>

      <h2>6. Payments through Paddle</h2>
      <p>
        Card payments are handled by our online reseller <strong>Paddle.com</strong>. Paddle.com is the Merchant of Record for all our orders. Paddle provides all
        customer service inquiries and handles returns. When you buy Pro by card, you are buying from Paddle, and Paddle’s{" "}
        <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">
          Buyer Terms
        </a>{" "}
        also apply to the purchase.
      </p>
      <ul>
        <li>Monthly and yearly card plans renew automatically until you cancel. You can cancel any time from Billing → Manage subscription; Pro then stays on until the end of the period you paid for.</li>
        <li>If a renewal payment fails, Pro may stop until the payment goes through.</li>
        <li>
          You can also pay in cryptocurrency through NOWPayments. Crypto payments are prepaid: each payment adds one month or one year of Pro and never renews by
          itself.
        </li>
        <li>
          Refunds are explained in our <Link href="/refund">Refund Policy</Link>.
        </li>
      </ul>

      <h2>7. Affiliate program</h2>
      <p>
        If you join the affiliate program, you earn a commission on payments made by people who sign up with your link, at the rates shown on the Affiliate page.
        Commissions on refunded payments are cancelled. Self-referrals, fake accounts, spam and paid ads on our brand name are not allowed and can lead to lost
        commissions and a closed affiliate account. Payouts are sent to the payout email you give, once the amount shown on the Affiliate page is available.
      </p>

      <h2>8. Custom domains</h2>
      <p>
        If you connect your own domain, you must own it or have permission to use it, and you are responsible for its DNS settings and renewal. We may remove a domain
        that is misused or that stops pointing to us.
      </p>

      <h2>9. Availability and changes</h2>
      <p>
        We work to keep {brand.name} online and fast, but we can’t promise it will never be interrupted or free of errors. We may add, change or remove features. If we
        ever close the Service, we will tell paying users in advance and refund any unused prepaid time.
      </p>

      <h2>10. Disclaimer and limitation of liability</h2>
      <p>
        The Service is provided “as is” and “as available”. To the extent the law allows, we give no warranties of any kind, and we are not liable for indirect or
        consequential losses such as lost profits, revenue or data. Our total liability for any claim about the Service is limited to the amount you paid us in the 12
        months before the claim. Nothing in these terms limits rights you have as a consumer that cannot be limited by law.
      </p>

      <h2>11. Ending the agreement</h2>
      <p>
        You can stop using {brand.name} and delete your account at any time. We may suspend or close accounts that break these terms. Sections that by their nature
        should continue (for example content licences you gave for backups, disclaimers and liability limits) continue after the account is closed.
      </p>

      <h2>12. Changes to these terms</h2>
      <p>
        We may update these terms. If a change is important, we will tell you by email or in the dashboard before it takes effect. If you keep using the Service after
        that, you accept the new terms.
      </p>

      <h2>13. Law</h2>
      <p>
        These terms are governed by the laws of the Kingdom of Morocco, without affecting any mandatory consumer protection rules of the country where you live. If
        there is a problem, please email us first; most issues can be solved quickly that way.
      </p>

      <h2>14. Contact</h2>
      <p>
        Email <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>. For questions about a card payment, you can also contact Paddle through{" "}
        <a href="https://paddle.net" target="_blank" rel="noreferrer">
          paddle.net
        </a>
        .
      </p>
    </LegalPage>
  );
}
