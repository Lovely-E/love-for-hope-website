# LOVE FOR HOPE — website + secure application backend

This project is a deployable starter implementation based on the supplied 3-page Love for Hope Organisation Profile. The original logo artwork embedded in the PDF is extracted without redesign and is used in `assets/love-for-hope-logo.jpg`.

## Important profile decision: eligibility
The official profile says beneficiaries are **9–18 years** (pages 1–2), Kenyan citizens, currently enrolled in a registered Kenyan school and from less fortunate backgrounds. The project enforces 9–18. The brief also mentions 9–19; that conflicts with the official profile. Obtain written approval and update the HTML, server validation and SQL constraint together before changing the age range.

## What is included
- Responsive public website, mission/vision/objectives/values, process, support and contact sections.
- Student/guardian application form, required supporting document uploads (PDF/JPG/PNG), consent, calculated age and reference number.
- Supabase Edge Function writes application data and files to a private Storage bucket; sends notification and acknowledgement emails using Resend when configured.
- Guardian national ID is encrypted with AES-256-GCM before it is stored. The encryption key is server-only.
- Administrator sign-in using Supabase Auth; admin role check; application list, status updates and five-minute signed document links.
- Database tables for applications, documents, enquiries, scholarships and scholarship payments.
- Privacy/child-protection notice starter template.
- No false payment confirmation. Payment status remains `Unpaid` until a verified provider integration is added.

## Deliberate limits before live use
1. **This is not yet a deployed live service.** You must create and configure the Supabase project, email provider, GitHub repository and hosting.
2. M-Pesa is not connected because Love for Hope has not supplied a Paybill/Till number, Daraja credentials or callback URL. Do not accept or claim payment confirmation until that integration is completed. The website states the KSh 1,250 fee and explains its purpose.
3. This initial application form submits **one student per application**. A guardian with multiple children submits one form per child; each gets its own reference. The fee is KSh 1,250 per student.
4. Each document is limited to 1 MB and all files together to 4 MB to keep the public serverless request within practical limits. Increase only after changing the upload flow to direct signed uploads.
5. The dashboard is a first operational version: login, list, status changes and private file access are implemented. Advanced filters, bulk export, applicant messaging, full scholarship award workflows and payment reconciliation need additional development.
6. Have the privacy notice and collection workflow reviewed by a Kenyan data-protection professional before collecting children's personal data. Confirm ODPC registration/assessment obligations, lawful basis, parent/guardian consent, processor contracts, retention/deletion, incident response and access audit. This code is a technical baseline, not legal advice.
7. Add rate limiting, CAPTCHA/bot protection, strict production CORS allowlist, monitoring, backups and periodic access reviews before public launch.

## 1. Create Supabase
1. Create a project at https://supabase.com/.
2. In Project Settings → API, copy the Project URL and anon/public key.
3. In the SQL Editor, run `supabase/schema.sql`.
4. In Authentication → Users, create the first administrator user with a strong password.
5. In SQL Editor, add that user's UUID to `admin_users`:
   ```sql
   insert into public.admin_users(user_id, role)
   values ('PASTE_AUTH_USER_UUID_HERE', 'super_admin');
   ```
   Only add trusted staff. Do not expose the admin account to the public.
6. In Edge Function secrets, set:
   - `SUPABASE_URL` = project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service-role key (server-side secret only)
   - `ID_ENCRYPTION_KEY` = base64 encoding of exactly 32 random bytes
   - `RESEND_API_KEY` = Resend API key (optional until email is enabled)
   - `EMAIL_FROM` = verified sender, e.g. `Love for Hope <applications@your-verified-domain>`
   - `ORG_EMAIL` = `lovelyforhope@gmail.com`

   Generate a 32-byte key securely, for example with a trusted password manager or local cryptographic generator. Never paste it into `config.js`, GitHub Pages, a public repository, or this README. Keep a secure backup; losing it means stored national ID ciphertext cannot be decrypted.
7. Deploy both Edge Functions in `supabase/functions/`. Use Supabase CLI (`supabase link --project-ref YOUR_PROJECT_REF` then `supabase functions deploy submit-application --no-verify-jwt` and `supabase functions deploy contact-enquiry --no-verify-jwt`). Or use the included GitHub Actions workflow after setting repository secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID`.
8. Configure Resend and verify the sender domain before expecting notification/acknowledgement email. The Edge Function never attaches sensitive documents to email.

## 2. Configure the website
1. Copy `config.example.js` to `config.js`.
2. Put the Supabase Project URL and anon/public key in `config.js`.
3. Never put the service-role key or ID encryption key in browser code.
4. Test the form using dummy data and non-sensitive sample documents first.

## 3. Deploy the public website free with GitHub Pages
1. Create a **public** GitHub repository named `love-for-hope-website`.
2. Upload the contents of this folder (not the enclosing folder) to the repository root. Include `index.html`, `app.js`, `config.js`, `privacy.html`, `assets/`, and `.nojekyll`.
3. In repository Settings → Pages, choose Deploy from a branch, branch `main`, folder `/root`, then Save.
4. Wait for GitHub Pages to publish. The address will look like `https://YOUR-USERNAME.github.io/love-for-hope-website/`.
5. Open the website on Android and test navigation, form validation and contact section.

## 4. Before accepting actual applications
- Complete the Supabase and Resend setup and test successful + failed submissions.
- Restrict Edge Function CORS in both functions to the exact live website origin (replace `*`).
- Add CAPTCHA and server-side rate limiting.
- Have the organisation approve its eligibility rules, fee collection method, consent language and privacy notice.
- Test document links expire and cannot be accessed when signed out.
- Confirm who can access the admin account and revoke access immediately when staff leave.
- Back up the database and set retention/deletion policies.

## 5. M-Pesa integration
The current site intentionally does not mark payments as paid. To implement real M-Pesa STK Push, the organisation must provide the official Paybill/Till number, Safaricom Daraja app credentials, registered callback endpoint and business verification details. Implement the STK request on a server-side Edge Function, validate Safaricom callback signatures/fields, store the transaction reference and amount, and only then update payment status. Never collect an M-Pesa PIN on this website.

## 6. Source structure
- `index.html`, `styles embedded`, `app.js` — public site and client logic
- `assets/love-for-hope-logo.jpg` — original extracted profile logo
- `privacy.html` — privacy notice starter
- `config.example.js` — browser-safe public configuration template
- `supabase/schema.sql` — database, access policies and private bucket
- `supabase/functions/submit-application/` — validated secure application endpoint
- `supabase/functions/contact-enquiry/` — enquiry endpoint
- `.github/workflows/deploy-supabase.yml` — optional function deployment workflow

## Source basis
The supplied profile states the organisation's Mombasa location, contact details, mission, vision, values, eligibility age 9–18, Kenyan citizenship, registered-school enrolment, KSh 1,250 verification fee, document verification and home assessment process.
