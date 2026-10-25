import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `${brand.name} Pro comes with a 14-day money-back guarantee. How to cancel, how to ask for a refund, and how card and crypto refunds work.`,
  alternates: { canonical: "/refund" },
};

export default function RefundPage() {
  return (
    <LegalPage
      current="/refund"
      title="Refund Policy"
      intro={`We want you to be happy with ${brand.name} Pro. If it isn’t right for you, you can get your money back within 14 days of paying, no questions asked.`}
    >
      <h2>1. 14-day money-back guarantee</h2>
      <p>
        You can ask for a full refund within <strong>14 days</strong> of any Pro payment, whether it is your first payment or a renewal, monthly or yearly. When the
        refund is made, your account goes back to the Free plan.
      </p>

      <h2>2. How to ask for a refund</h2>
      <ul>
        <li>
          <strong>Card payments</strong> are processed by Paddle, our Merchant of Record. Request a refund at{" "}
          <a href="https://paddle.net" target="_blank" rel="noreferrer">
            paddle.net
          </a>{" "}
          using the email on your receipt, or email us at <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> and we will arrange it with Paddle.
        </li>
        <li>
          <strong>Crypto payments</strong>: email <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> from your account’s email with the payment date,
          and the wallet address to refund. We refund the US dollar amount you paid, in the same coin when possible; network fees are taken from the refund.
        </li>
      </ul>
      <p>We answer refund requests within 2 business days.</p>

      <h2>3. When you get the money</h2>
      <p>
        Card refunds go back to the card or payment method you used. Banks usually show them within 5–10 business days. Crypto refunds are sent once the wallet address
        is confirmed.
      </p>

      <h2>4. Cancelling</h2>
      <p>
        You can cancel a card plan at any time in <Link href="/dashboard/billing">Billing</Link> → Manage subscription. Cancelling stops future renewals; Pro stays on
        until the end of the period you already paid for. Crypto payments never renew, so there is nothing to cancel.
      </p>

      <h2>5. After 14 days</h2>
      <p>
        After 14 days, payments are generally not refundable, and we don’t refund partial months or years. We still look at every case: if something went wrong, for
        example you were charged twice or Pro didn’t work, email us and we will make it right. This doesn’t affect any right to a refund you have under the consumer
        laws of your country.
      </p>

      <h2>6. When refunds can be refused</h2>
      <p>
        We may refuse a refund in cases of clear abuse, for example repeated buy-and-refund cycles, or an account closed for breaking our{" "}
        <Link href="/terms">Terms of Service</Link>, as far as the law allows.
      </p>
    </LegalPage>
  );
}
