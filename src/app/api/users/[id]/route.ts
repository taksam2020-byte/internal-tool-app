import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PUT(request: NextRequest, { params }: any) {
  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();

    // Dynamically build the SET clause
    const fieldsToUpdate = Object.keys(body);
    const setClauses = fieldsToUpdate.map((field, i) => `"${field}" = $${i + 2}`).join(', ');
    const values = fieldsToUpdate.map(field => body[field]);

    if (fieldsToUpdate.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    await sql.query(
      `UPDATE users SET ${setClauses} WHERE id = $1`,
      [id, ...values]
    );
    
    return NextResponse.json({ message: 'User updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ message: 'Error updating user' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(_request: NextRequest, { params }: any) {
    try {
        const id = parseInt(params.id, 10);
        await sql`DELETE FROM users WHERE id = ${id};`;
        return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete user:', error);
        return NextResponse.json({ message: 'Error deleting user' }, { status: 500 });
    }
}