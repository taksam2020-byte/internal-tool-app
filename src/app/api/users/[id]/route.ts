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
        const { rows: users } = await sql`SELECT name FROM users WHERE id = ${id}`;
        if (users.length === 0) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }
        const userName = users[0].name;

        // Delete related evaluations first
        await sql`DELETE FROM evaluations WHERE evaluator_name = ${userName} OR target_employee_name = ${userName};`;

        // Then delete the user
        await sql`DELETE FROM users WHERE id = ${id};`;

        return NextResponse.json({ message: 'User and related evaluations deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete user and evaluations:', error);
        return NextResponse.json({ message: 'Error deleting user' }, { status: 500 });
    }
}