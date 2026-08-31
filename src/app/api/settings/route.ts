
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET handler to fetch settings
export async function GET() {
  try {
    const { rows } = await sql`SELECT value FROM app_settings WHERE key = 'default';`;
    if (rows.length > 0) {
      const settings = rows[0].value;
      // Ensure the new setting has a default value if not present
      if (typeof settings.show_approval_form_menu === 'undefined') {
        settings.show_approval_form_menu = true;
      }
      return NextResponse.json(settings, { status: 200 });
    }
    // If no settings are found, return a default structure
    return NextResponse.json({
      show_admin_menu: true,
      show_customer_menu: true,
      show_history_menu: true,
      show_approval_form_menu: true, // Default to true
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ message: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST handler to save or update settings
export async function POST(request: Request) {
  try {
    const settings = await request.json();
    
    await sql`
      INSERT INTO app_settings (key, value)
      VALUES ('default', ${JSON.stringify(settings)})
      ON CONFLICT (key) 
      DO UPDATE SET value = ${JSON.stringify(settings)};
    `;

    return NextResponse.json({ message: 'Settings saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ message: 'Failed to save settings' }, { status: 500 });
  }
}
