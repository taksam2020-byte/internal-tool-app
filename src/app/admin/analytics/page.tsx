'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Table } from 'react-bootstrap';
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
} from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, RadialLinearScale, Filler
);

interface MonthlyAverages {
    month: string;
    averageTotal100: number;
    itemAverages: { [key: string]: number };
}

interface ChartJsDataset {
    label: string;
    data: number[];
}

interface AnalyticsData {
    monthlyData: { [month: string]: MonthlyAverages };
    latestMonth: MonthlyAverages;
    chartJsData: {
        labels: string[];
        datasets: ChartJsDataset[];
    };
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get<AnalyticsData>('/api/analytics/evaluations');
                setData(res.data);
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
        return <div className="text-center vh-100 d-flex flex-column align-items-center justify-content-center"><Spinner animation="border" /> <p className="mt-3">分析データを読み込み中...</p></div>;
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    if (!data || !data.latestMonth) {
        return <Alert variant="info">まだ分析できる評価データがありません。</Alert>;
    }

    const radarChartData = {
        labels: data.chartJsData.datasets.map((ds) => ds.label),
        datasets: [{
            label: `${data.latestMonth.month} 平均点`,
            data: Object.values(data.latestMonth.itemAverages),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
        }],
    };

    const lineChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: '項目別平均点の月次推移',
            },
        },
    };

    return (
        <div>
            <h1 className="mb-4">新人考課 集計・分析</h1>
            
            <Row>
                <Col lg={8} className="mb-4">
                    <Card>
                        <Card.Body>
                            <Line options={lineChartOptions} data={data.chartJsData} />
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4} className="mb-4">
                    <Card>
                        <Card.Body>
                             <Card.Title className="text-center mb-3">{data.latestMonth.month} 平均点</Card.Title>
                            <Radar data={radarChartData} />
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Alert variant="light" className="text-center small">
                ※グラフおよび表内の「将来性」項目は、他の項目との比較のため5点満点に換算して表示しています。
            </Alert>

            <Card>
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
                                    {Object.values(monthData.itemAverages).map((avg, index) => (
                                        <td key={index}>{avg.toFixed(1)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

        </div>
    );
}