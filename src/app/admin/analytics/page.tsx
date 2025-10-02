'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Form } from 'react-bootstrap';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler,
  ChartDataset,
} from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, RadialLinearScale, Filler
);

interface MonthlyAverages {
    month: string;
    averageTotal100: number;
    itemAverages: { [key: string]: number };
    rawItemAverages: { [key: string]: number };
}

interface ChartJsDataset {
    label: string;
    data: number[];
}

interface AnalyticsData {
    monthlyData: { [month: string]: MonthlyAverages };
    latestMonth: MonthlyAverages | null;
    chartJsData: {
        labels: string[];
        datasets: ChartJsDataset[];
    };
    cumulativeAverage: string;
    crossTabData: {
        headers: string[];
        rows: { [key: string]: any }[];
    };
    filterOptions: {
        months: string[];
        targets: string[];
    };
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedTarget, setSelectedTarget] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (selectedMonth) params.append('month', selectedMonth);
                if (selectedTarget) params.append('target', selectedTarget);

                const res = await axios.get<AnalyticsData>(`/api/analytics/evaluations?${params.toString()}`);
                setData(res.data);
            } catch (err) {
                setError('データの読み込みに失敗しました。');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedMonth, selectedTarget]);

    if (loading) {
        return <div className="text-center vh-100 d-flex flex-column align-items-center justify-content-center"><Spinner animation="border" /> <p className="mt-3">分析データを読み込み中...</p></div>;
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    if (!data || !data.filterOptions) {
        return <Alert variant="info">まだ分析できる評価データがありません。</Alert>;
    }

    const lineChartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const },
            title: { display: true, text: '項目別平均点の月次推移' },
        },
    };

    const radarChartData = data.latestMonth ? {
        labels: data.chartJsData.datasets.map((ds) => ds.label),
        datasets: [
            {
                label: `${data.latestMonth.month} 平均点`,
                data: Object.values(data.latestMonth.itemAverages),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ] as ChartDataset<'radar'>[],
    } : null;

    return (
        <div>
            <h1 className="mb-4">新人考課 集計・分析</h1>

            <Card className="mb-4">
                <Card.Body>
                    <Form as={Row} className="align-items-end">
                        <Form.Group as={Col} md={4} controlId="month-filter">
                            <Form.Label>月で絞り込み</Form.Label>
                            <Form.Select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                                <option value="">すべての月</option>
                                {data.filterOptions.months.map(m => <option key={m} value={m}>{m}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group as={Col} md={4} controlId="target-filter">
                            <Form.Label>対象者で絞り込み</Form.Label>
                            <Form.Select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)}>
                                <option value="">すべての対象者</option>
                                {data.filterOptions.targets.map(t => <option key={t} value={t}>{t}</option>)}
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Card.Body>
            </Card>

            {data.cumulativeAverage && (
                <Card className="mb-4 text-center">
                    <Card.Header>累計平均点 (100点換算)</Card.Header>
                    <Card.Body>
                        <h2 className="display-4 fw-bold">{data.cumulativeAverage}</h2>
                    </Card.Body>
                </Card>
            )}
            
            {data.latestMonth && (
                <Row>
                    <Col lg={8} className="mb-4">
                        <Card>
                            <Card.Body>
                                <Line options={lineChartOptions} data={data.chartJsData} />
                            </Card.Body>
                        </Card>
                    </Col>
                    {radarChartData && (
                        <Col lg={4} className="mb-4">
                            <Card>
                                <Card.Body>
                                    <Card.Title className="text-center mb-3">{data.latestMonth.month} 平均点</Card.Title>
                                    <Radar data={radarChartData} />
                                </Card.Body>
                            </Card>
                        </Col>
                    )}
                </Row>
            )}

            <Alert variant="light" className="text-center small">
                ※グラフおよび表内の「将来性」項目は、他の項目との比較のため5点満点に換算して表示しています。
            </Alert>

            {Object.keys(data.monthlyData).length > 0 && (
                <Card className="mb-4">
                    <Card.Header as="h5">月別サマリー</Card.Header>
                    <Card.Body>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>月</th>
                                    <th>平均点 (100点換算)</th>
                                    {data.chartJsData.datasets.map((ds) => <th key={ds.label}>{ds.label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.values(data.monthlyData).map((monthData) => (
                                    <tr key={monthData.month}>
                                        <td>{monthData.month}</td>
                                        <td>{monthData.averageTotal100.toFixed(1)}</td>
                                        {Object.values(monthData.rawItemAverages).map((avg: number, index: number) => (
                                            <td key={index}>{avg.toFixed(1)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {data.crossTabData && data.crossTabData.rows.length > 0 && (
                <Card>
                    <Card.Header as="h5">クロス集計表</Card.Header>
                    <Card.Body>
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    {data.crossTabData.headers.map(header => <th key={header}>{header}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data.crossTabData.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {data.crossTabData.headers.map(header => <td key={header}>{row[header]}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

        </div>
    );
}
