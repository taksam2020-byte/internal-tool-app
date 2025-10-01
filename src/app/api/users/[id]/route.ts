import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    // TODO: Add validation to prevent deletion of users associated with evaluations or proposals

    const result = await sql`DELETE FROM users WHERE id = ${id};`;

    if (result.rowCount === 0) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 }); // No Content
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ message: 'Error deleting user' }, { status: 500 });
  }
}
