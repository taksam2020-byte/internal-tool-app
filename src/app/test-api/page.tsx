'use client';

import { useState } from 'react';
import { Button, Container, Form, Spinner, Alert, Card } from 'react-bootstrap';
import axios from 'axios';

export default function TestApiPage() {
    const [selectedMonth, setSelectedMonth] = useState('2025-10');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<any>(null);

    const months = ['2025-10', '2025-09', '2025-08'];

    const handleFetch = async () => {
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const params = new URLSearchParams({ month: selectedMonth });
            const res = await axios.get(`/api/test?${params.toString()}`);
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="mt-5">
            <Card>
                <Card.Header as="h3">API動作テスト</Card.Header>
                <Card.Body>
                    <p>月を選択して「データ取得」ボタンを押し、APIが正しい件数を返すか確認します。</p>
                    <Form.Group className="mb-3">
                        <Form.Label>月度</Form.Label>
                        <Form.Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </Form.Select>
                    </Form.Group>
                    <Button onClick={handleFetch} disabled={loading}>
                        {loading ? <Spinner as="span" animation="border" size="sm" /> : 'データ取得'}
                    </Button>

                    {error && <Alert variant="danger" className="mt-4">{error}</Alert>}

                    {result && (
                        <Card className="mt-4">
                            <Card.Header>APIレスポンス</Card.Header>
                            <Card.Body>
                                <pre>{JSON.stringify(result, null, 2)}</pre>
                            </Card.Body>
                        </Card>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}
