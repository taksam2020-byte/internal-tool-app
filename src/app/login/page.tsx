'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Form, Button, Card, Container, Row, Col, Alert } from 'react-bootstrap';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setIsAuthenticated } = useAuth();
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin') {
            setIsAuthenticated(true);
            router.push('/admin');
        } else {
            setError('パスワードが正しくありません。');
        }
    };

    return (
        <Container>
            <Row className="justify-content-md-center mt-5">
                <Col md={6}>
                    <Card>
                        <Card.Header as="h4">管理画面ログイン</Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleLogin}>
                                <Form.Group className="mb-3" controlId="password">
                                    <Form.Label>パスワード</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="パスワードを入力"
                                        required
                                        autoFocus
                                    />
                                </Form.Group>
                                {error && <Alert variant="danger">{error}</Alert>}
                                <div className="d-grid">
                                    <Button variant="primary" type="submit">ログイン</Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}
