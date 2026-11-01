<?php

namespace App\Mail;

use App\Support\Locales;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// Sent when a join request is approved: tells the contact the account is ready and gives the one-time link
// to choose a password. One email in both languages (Arabic first). Texts: `email.join.approved.*`.
class JoinApprovedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    // $vars: name, clientAr, clientEn, url (the set-password link), days (how long the link works).
    public function __construct(public array $vars)
    {
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        $subject = fn (string $locale) => Locales::t($locale, 'email.join.approved.subject', $this->varsFor($locale));

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
                'greeting' => Locales::t($locale, 'email.join.approved.greeting', $vars),
                'body' => Locales::t($locale, 'email.join.approved.body', $vars),
                'button' => Locales::t($locale, 'email.join.approved.button', $vars),
                'note' => Locales::t($locale, 'email.join.approved.note', $vars),
                'footer' => Locales::t($locale, 'email.common.footer', $vars),
            ];
        }

        return new Content(view: 'mail.invitation', with: ['sections' => $sections, 'url' => $this->vars['url']]);
    }

    private function varsFor(string $locale): array
    {
        $vars = $this->vars;
        $vars['client'] = $locale === 'en' ? ($vars['clientEn'] ?? '') : ($vars['clientAr'] ?? '');

        return $vars;
    }
}
