'use client';

import { useState } from 'react';
import { Form, Button, Container, Alert, Row, Col, Card } from 'react-bootstrap';
import AnalyticsPageContent from './AnalyticsPageContent';

export default function AnalyticsAuthPage() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'Daisuke0905') {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('パスワードが正しくありません。');
        }
    };

    if (isAuthenticated) {
        return <AnalyticsPageContent />;
    }

    return (
        <Container>
            <Row className="justify-content-md-center mt-5">
                <Col md={6}>
                    <Card>
                        <Card.Header as="h4">考課結果閲覧</Card.Header>
                        <Card.Body>
                            <p className="text-center text-muted mb-4">考課結果を閲覧するにはパスワードを入力してください。</p>
                            <Form onSubmit={handleLogin}>
                                <Form.Group className="mb-3" controlId="formPassword">
                                    <Form.Label>パスワード</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="パスワード"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </Form.Group>
                                {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
                                <div className="d-grid mt-4">
                                    <Button variant="primary" type="submit">認証</Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}