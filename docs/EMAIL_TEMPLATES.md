# LOKITA — Branded auth email templates

Where to paste: **Supabase Dashboard → Authentication → Emails (Email Templates)**.
Pick the template on the left, replace the **Subject** and **Message body (HTML)**,
press **Save**, then repeat for the next one.

⚠️ Keep `{{ .ConfirmationURL }}` exactly as written — Supabase replaces it with
the real link when the email is sent. If you delete or change it, the buttons
stop working.

Sender name: in **Authentication → Emails → SMTP settings** (or the "Sender
details" section) set the sender name to `LOKITA`. If you are on Supabase's
built-in mailer the address stays `noreply@mail.app.supabase.io` — that's fine
for launch; a custom domain mailer can come later.

---

## 1. Confirm signup

**Subject:**

```
Welcome to LOKITA — confirm your email
```

**Message body:**

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EDF5F9;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #BFDCE8;">
      <tr>
        <td style="background:#101418;padding:22px 28px;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:4px;">LOKITA</span><br>
          <span style="color:#519BB8;font-size:11px;letter-spacing:2px;">JIU DORM MARKETPLACE</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 8px;font-size:17px;color:#101418;"><b>Welcome to LOKITA! 👋</b></p>
          <p style="margin:0 0 20px;font-size:14px;color:#3a4550;line-height:1.6;">
            One tap and you're in — confirm your email to start buying and
            selling inside the JIU dorms.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td style="background:#519BB8;border-radius:10px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 30px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">Confirm my email →</a>
          </td></tr></table>
          <p style="margin:20px 0 0;font-size:12px;color:#8a97a3;line-height:1.6;">
            Didn't sign up for LOKITA? You can safely ignore this email.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 28px;background:#EDF5F9;border-top:1px solid #BFDCE8;">
          <span style="font-size:11px;color:#8a97a3;">LOKITA · Jakarta International University, Cikarang</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
```

---

## 2. Reset password

**Subject:**

```
Reset your LOKITA password
```

**Message body:**

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EDF5F9;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #BFDCE8;">
      <tr>
        <td style="background:#101418;padding:22px 28px;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:4px;">LOKITA</span><br>
          <span style="color:#519BB8;font-size:11px;letter-spacing:2px;">JIU DORM MARKETPLACE</span>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 8px;font-size:17px;color:#101418;"><b>Reset your password 🔑</b></p>
          <p style="margin:0 0 20px;font-size:14px;color:#3a4550;line-height:1.6;">
            Someone (hopefully you) asked to reset the password for this
            LOKITA account. Tap the button to choose a new one.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td style="background:#519BB8;border-radius:10px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 30px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">Choose a new password →</a>
          </td></tr></table>
          <p style="margin:20px 0 0;font-size:12px;color:#8a97a3;line-height:1.6;">
            If you didn't ask for this, ignore this email — your password
            stays unchanged.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 28px;background:#EDF5F9;border-top:1px solid #BFDCE8;">
          <span style="font-size:11px;color:#8a97a3;">LOKITA · Jakarta International University, Cikarang</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
```

---

Only these two templates matter — LOKITA uses email+password sign-in, so
"Magic Link" / "Invite user" / "Change Email" are never sent. (If you ever
enable those flows, copy the same layout and adjust the words.)
