
import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(request: NextRequest, context: { params: Promise<{ id:string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    const fieldsToUpdate: { [key: string]: unknown } = {};
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      fieldsToUpdate.status = body.status;
      queryParams.push(body.status);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'processed_by')) {
      fieldsToUpdate.processed_by = body.processed_by || null;
      queryParams.push(body.processed_by || null);
    }

    // Handle processed_at separately
    if (body.status === '処理済み') {
      fieldsToUpdate.processed_at = 'CURRENT_TIMESTAMP';
    } else if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      fieldsToUpdate.processed_at = null;
      queryParams.push(null);
    }
    
    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const setClauses = Object.keys(fieldsToUpdate).map(key => {
      if (key === 'processed_at' && fieldsToUpdate[key] === 'CURRENT_TIMESTAMP') {
        return `${key} = CURRENT_TIMESTAMP`;
      }
      return `${key} = $${paramIndex++}`;
    });
    
    const query = `UPDATE applications SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`;
    queryParams.push(id);

    await sql.query(query, queryParams);

    return NextResponse.json({ message: 'Application updated successfully' }, { status: 200 });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Error updating application', error: message }, { status: 500 });
  }
}
