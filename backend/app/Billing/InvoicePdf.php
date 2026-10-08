<?php

namespace App\Billing;

use App\Models\Invoice;
use App\Models\Payment;
use App\Support\Locales;
use Mpdf\Mpdf;

// The invoice as a PDF, Arabic (right-to-left) and English on the same page. Texts: `pdf.invoice.*`
// in public/locales. Used by the download route and attached to billing emails.
class InvoicePdf
{
    public function render(Invoice $invoice): string
    {
        $invoice->loadMissing('tenant', 'subscription.plan', 'payments');

        $sections = [];
        foreach (Locales::SUPPORTED as $locale) {
            $sections[] = $this->section($invoice, $locale);
        }

        $logo = base_path('../public/images/logos/himma-logo.png');
        $html = view('pdf.invoice', [
            'sections' => $sections,
            'logo' => is_file($logo) ? $logo : null,
            'number' => $invoice->number,
        ])->render();

        $tempDir = storage_path('app/mpdf');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0775, true);
        }

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'tempDir' => $tempDir,
            'default_font' => 'dejavusans',
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
            'margin_top' => 14,
            'margin_bottom' => 14,
        ]);
        $mpdf->SetTitle($invoice->number);
        $mpdf->WriteHTML($html);

        return $mpdf->Output('', 'S');
    }

    private function section(Invoice $invoice, string $locale): array
    {
        $t = fn (string $key, array $vars = []) => Locales::t($locale, "pdf.invoice.$key", $vars);
        $money = fn (float $amount) => number_format($amount, 2).' '.$invoice->currency;
        $plan = $invoice->subscription?->plan;

        $rows = [
            [$t('number'), $invoice->number],
            [$t('client'), $locale === 'en' ? $invoice->tenant->name_en : $invoice->tenant->name_ar],
            [$t('issuedAt'), optional($invoice->issued_at)->toDateString()],
            [$t('dueAt'), optional($invoice->due_at)->toDateString()],
        ];
        if ($invoice->period_start && $invoice->period_end) {
            $rows[] = [$t('period'), $invoice->period_start->toDateString().' — '.$invoice->period_end->toDateString()];
        }
        if ($plan) {
            $rows[] = [$t('plan'), $locale === 'en' ? $plan->name_en : $plan->name_ar];
        }
        $rows[] = [$t('status'), Locales::t($locale, "admin.billing.status.{$invoice->status}")];

        $payments = $invoice->payments->where('status', 'succeeded')->map(fn (Payment $p) => [
            optional($p->paid_at)->toDateString(),
            Locales::t($locale, "admin.billing.method.{$p->method}"),
            $p->reference ?: '—',
            $money((float) $p->amount),
        ])->values()->all();

        return [
            'locale' => $locale,
            'dir' => $locale === 'ar' ? 'rtl' : 'ltr',
            'align' => $locale === 'ar' ? 'right' : 'left',
            'title' => $t('title'),
            'platform' => $t('platform'),
            'rows' => $rows,
            'totals' => [
                [$t('amount'), $money((float) $invoice->amount)],
                [$t('paid'), $money($invoice->paidAmount())],
                [$t('balance'), $money($invoice->balance())],
            ],
            'paymentsTitle' => $t('payments'),
            'paymentHeaders' => [$t('paymentDate'), $t('paymentMethod'), $t('paymentReference'), $t('amount')],
            'payments' => $payments,
            'footer' => $t('footer'),
        ];
    }
}
