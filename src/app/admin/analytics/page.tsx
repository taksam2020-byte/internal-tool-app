'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

// TODO: Define the structure of the analytics data
interface AnalyticsData {
    // Define properties for charts and tables
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // TODO: Create and call the actual analytics API endpoint
                // const res = await axios.get('/api/analytics/evaluations');
                // setData(res.data);
                console.log("Analytics page mounted. API call is commented out for now.");
            } catch (err) {
                setError('データの読み込みに失敗しました。');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="text-center"><Spinner animation="border" /> <p>分析データを読み込み中...</p></div>;
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <div>
            <h1 className="mb-4">集計・分析</h1>
            <p>このページでは、新人考課のデータを様々な角度から分析します。</p>
            
            {/* TODO: Add Chart.js components for line and radar charts */}
            <Row>
                <Col md={8}>
                    <Card className="mb-4">
                        <Card.Body>
                            <Card.Title>月別平均点の推移</Card.Title>
                            {/* Line Chart Component Here */}
                            <div style={{height: '300px'}} className="d-flex align-items-center justify-content-center bg-light text-muted">[折れ線グラフ]</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="mb-4">
                        <Card.Body>
                            <Card.Title>最新月の評価項目</Card.Title>
                            {/* Radar Chart Component Here */}
                            <div style={{height: '300px'}} className="d-flex align-items-center justify-content-center bg-light text-muted">[レーダーチャート]</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* TODO: Add tables for cross-tabulation and monthly averages */}
            <Card>
                <Card.Body>
                    <Card.Title>月別平均点（表）</Card.Title>
                    <div className="d-flex align-items-center justify-content-center bg-light text-muted" style={{height: '200px'}}>[月別平均点のテーブル]</div>
                </Card.Body>
            </Card>

        </div>
    );
}
