import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    if (user && pass && !user.includes('your_email')) {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: false,
        auth: { user, pass },
      });
      this.logger.log('✅ Email service configured.');
    } else {
      this.logger.warn('⚠️ Email not configured. Set MAIL_USER and MAIL_PASS in .env to enable emails.');
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.logger.log(`📧 [MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'FYP Portal',
        to,
        subject,
        html,
      });
      this.logger.log(`✅ Email sent to ${to}`);
    } catch (err) {
      this.logger.error(`❌ Failed to send email to ${to}: ${err.message}`);
    }
  }

  async sendCommitteeMemberEmail(member: any, committee: any) {
    const groupRows = committee.groups
      .map(
        (g: any) =>
          `<tr>
            <td style="padding:8px;border:1px solid #e2e8f0;">Group #${g.id}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${g.studentRegs?.join(', ') || 'N/A'}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${g.supervisorName || 'N/A'}</td>
          </tr>`,
      )
      .join('');

    const membersHtml = committee.members
      .map((m: any) => `<li>${m.name} — <em>${m.designation || 'Supervisor'}</em></li>`)
      .join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <div style="background:linear-gradient(135deg,#4a7dff,#6c5ce7);border-radius:8px;padding:20px;color:#fff;text-align:center;">
          <h2 style="margin:0;">FYP Management Portal</h2>
          <p style="margin:6px 0 0;opacity:.85;">Committee Assignment Notification</p>
        </div>
        <div style="background:#fff;border-radius:8px;padding:24px;margin-top:16px;border:1px solid #e2e8f0;">
          <p>Dear <strong>${member.name}</strong>,</p>
          <p>You have been assigned to <strong>${committee.name}</strong> as an evaluation committee member for this semester's FYP evaluation.</p>
          <h3 style="color:#4a7dff;">Committee Members</h3>
          <ul style="color:#334155;">${membersHtml}</ul>
          <h3 style="color:#4a7dff;">Groups Assigned for Evaluation</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Group</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Students (Reg#)</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Supervisor</th>
              </tr>
            </thead>
            <tbody>${groupRows}</tbody>
          </table>
          <p style="margin-top:20px;color:#64748b;font-size:13px;">Please log in to the FYP portal for more details.</p>
        </div>
      </div>`;

    await this.send(member.email, `FYP Committee Assignment — ${committee.name}`, html);
  }

  async sendStudentCommitteeEmail(student: any, group: any, committee: any) {
    const membersHtml = committee.members
      .map((m: any) => `<li>${m.name} — <em>${m.designation || 'Supervisor'}</em></li>`)
      .join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
        <div style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:8px;padding:20px;color:#fff;text-align:center;">
          <h2 style="margin:0;">FYP Management Portal</h2>
          <p style="margin:6px 0 0;opacity:.85;">Evaluation Committee Assigned</p>
        </div>
        <div style="background:#fff;border-radius:8px;padding:24px;margin-top:16px;border:1px solid #e2e8f0;">
          <p>Dear <strong>${student.user?.name || 'Student'}</strong>,</p>
          <p>Your FYP group (<strong>Group #${group.id}</strong>) has been assigned to an evaluation committee.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:16px 0;">
            <strong style="color:#15803d;">Committee: ${committee.name}</strong>
          </div>
          <h3 style="color:#16a34a;">Evaluation Committee Members</h3>
          <ul style="color:#334155;">${membersHtml}</ul>
          <p style="color:#64748b;font-size:13px;">Please log in to the FYP portal to view full committee details.</p>
        </div>
      </div>`;

    await this.send(
      student.user.email,
      `FYP Evaluation Committee Assigned — Group #${group.id}`,
      html,
    );
  }
}
