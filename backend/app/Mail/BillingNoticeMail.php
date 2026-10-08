<?php

namespace App\Mail;

use App\Billing\InvoicePdf;
use App\Models\Invoice;
use App\Support\Locales;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// One email in both languages (Arabic first, right-to-left; then English). Texts: `email.billing.<kind>.*`
// in public/locales. Queued after the database transaction commits.
class BillingNoticeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public const WITH_INVOICE = ['invoice_issued', 'payment_received', 'invoice_overdue'];

    public function __construct(public string $kind, public array $vars)
    {
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        $subject = fn (string $locale) => Locales::t($locale, "email.billing.{$this->kind}.subject", $this->varsFor($locale));

        return new Envelope(subject: $subject('ar').' | '.$subject('en'));
    }

    public function content(): Content
    {
        $sections = [];
        foreach (Locales::SUPPORTED as $locale) {
            $vars = $this->varsFor($locale);
            $sections[] = [
                'locale' => $locale,
                'dir' => $locale === 'ar' ? 'rtl' : 'ltr',
                'greeting' => Locales::t($locale, 'email.common.greeting', $vars),
                'body' => Locales::t($locale, "email.billing.{$this->kind}.body", $vars),
                'footer' => Locales::t($locale, 'email.common.footer', $vars),
            ];
        }

        return new Content(view: 'mail.billing-notice', with: ['sections' => $sections]);
    }

    // Alerts about an invoice carry it as a PDF, built when the email is sent.
    public function attachments(): array
    {
        if (! in_array($this->kind, self::WITH_INVOICE, true) || empty($this->vars['invoiceId'])) {
            return [];
        }

        $invoice = Invoice::where('cuid', $this->vars['invoiceId'])->first();
        if (! $invoice) {
            return [];
        }

        return [
            Attachment::fromData(fn () => app(InvoicePdf::class)->render($invoice), $invoice->number.'.pdf')
                ->withMime('application/pdf'),
        ];
    }

    // Values that have a language (client name) are picked per section.
    private function varsFor(string $locale): array
    {
        $vars = $this->vars;
        $vars['client'] = $locale === 'en' ? ($vars['clientEn'] ?? '') : ($vars['clientAr'] ?? '');

        return $vars;
    }
}
