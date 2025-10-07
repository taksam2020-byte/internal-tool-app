'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Nav, Button, Pagination } from 'react-bootstrap';
import { CaretUpFill, CaretDownFill } from 'react-bootstrap-icons';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';

// Type Definitions
interface EChartsRadarData { indicator: { name: string; max: number }[]; current: { value: number[]; name: string }[]; cumulative: { value: number[]; name: string }[]; }
interface AnalyticsData {
    crossTabData: { headers: string[]; rows: { [key: string]: string | number }[]; averages: { [key: string]: string | number } };
    comments: { evaluator: string; comment: string }[];
    eChartsRadarData: EChartsRadarData;
    currentMonthAverage: string;
    cumulativeAverage: string;
    filterOptions: { months: string[]; targets: string[] };
    monthlySummary: { month: string; totalScore: number; itemAverages: { [key: string]: number } }[];
    selectedMonth: string;
    selectedMonthLong: string;
}

const initialData: AnalyticsData = {
    crossTabData: { headers: [], rows: [], averages: {} },
    comments: [],
    eChartsRadarData: { indicator: [], current: [], cumulative: [] },
    currentMonthAverage: '0.0',
    cumulativeAverage: '0.0',
    filterOptions: { months: [], targets: [] },
    monthlySummary: [],
    selectedMonth: '',
    selectedMonthLong: '',
};

export default function AnalyticsPageContent() {
    const [data, setData] = useState<AnalyticsData>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTarget, setSelectedTarget] = useState('');
    const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
    const [commentPage, setCommentPage] = useState(0);

    useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            try {
                const res = await axios.get<AnalyticsData>(`/api/analytics/evaluations`);
                setData(res.data);
                if (res.data.filterOptions?.targets?.length > 0) {
                    setSelectedTarget(res.data.filterOptions.targets[0]);
                } else { setLoading(false); }
            } catch (err) { setError('データの読み込みに失敗しました。'); console.error(err); setLoading(false); }
        };
        fetchOptions();
    }, []);

    useEffect(() => {
        if (!selectedTarget) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ target: selectedTarget });
                if (data && data.filterOptions.months.length > currentMonthIndex) {
                    params.append('month', data.filterOptions.months[currentMonthIndex]);
                }
                const res = await axios.get<AnalyticsData>(`/api/analytics/evaluations?${params.toString()}`);
                setData(prevData => ({ ...res.data, filterOptions: prevData?.filterOptions || res.data.filterOptions }));
            } catch (err) { setError('分析データの読み込みに失敗しました。'); console.error(err); } 
            finally { setLoading(false); }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTarget, currentMonthIndex]);

    const handleTargetClick = (target: string) => { setSelectedTarget(target); setCurrentMonthIndex(0); setCommentPage(0); };
    const handlePrevMonth = () => { if (data && currentMonthIndex < data.filterOptions.months.length - 1) { setCurrentMonthIndex(p => p + 1); setCommentPage(0); } };
    const handleNextMonth = () => { if (currentMonthIndex > 0) { setCurrentMonthIndex(p => p - 1); setCommentPage(0); } };
    const handleCommentPagination = (evaluatorName: string) => {
        const pageIndex = data?.comments.findIndex(c => c.evaluator === evaluatorName);
        if (pageIndex !== undefined && pageIndex > -1) setCommentPage(pageIndex);
    };

    const getOption = (title: string, chartData: { value: number[], name: string }[], indicator: { name: string, max: number }[]) => ({
        title: { text: title, left: 'center', textStyle: { fontSize: 16 } },
        tooltip: { trigger: 'item' },
        radar: { indicator: indicator, shape: 'circle', center: ['50%', '55%'], radius: '65%' },
        series: [{ type: 'radar', data: chartData, areaStyle: { opacity: 0.2 } }]
    });

    if (loading && !data.filterOptions.targets.length) return <div className="text-center vh-100 d-flex flex-column align-items-center justify-content-center"><Spinner animation="border" /> <p className="mt-3">分析データを読み込み中...</p></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    const { crossTabData, comments, eChartsRadarData, currentMonthAverage, cumulativeAverage, filterOptions, selectedMonthLong } = data;
    const paginatedComments = comments?.slice(commentPage, commentPage + 1);
    const totalCommentPages = comments ? comments.length : 0;

    return (
        <div style={{ display: 'flex' }}>
            <div style={{ width: '220px', position: 'fixed', top: '6rem', left: 'calc(16.66666667% + 1rem)', height: 'calc(100vh - 7rem)', overflowY: 'auto', paddingRight: '15px' }}>
                <h4 className="mb-3">新人考課</h4>
                <Card className="text-center mb-4">
                    <Card.Header>月度</Card.Header>
                    <Card.Body>
                        <Button variant="link" onClick={handleNextMonth} disabled={loading || currentMonthIndex <= 0} className="p-0 text-decoration-none"><CaretUpFill size={24} /></Button>
                        <h5 className="my-2">{selectedMonthLong}</h5>
                        <Button variant="link" onClick={handlePrevMonth} disabled={loading || !filterOptions.months || currentMonthIndex >= filterOptions.months.length - 1} className="p-0 text-decoration-none"><CaretDownFill size={24} /></Button>
                    </Card.Body>
                </Card>
                <h5>対象者</h5>
                <Nav className="flex-column nav-pills">
                    {filterOptions.targets.map((target: string) => (
                        <Nav.Item key={target}><Nav.Link active={selectedTarget === target} onClick={() => handleTargetClick(target)} style={{cursor: 'pointer'}}>{target}</Nav.Link></Nav.Item>
                    ))}
                </Nav>
            </div>

            <main style={{ marginLeft: '240px', width: '100%' }}>
                <h1 className="mb-4">集計・分析</h1>
                {loading && <div className="text-center my-4"><Spinner animation="border" /></div>}
                {!loading && (
                    !selectedTarget ? <Alert variant="info">対象者を選択してください。</Alert> : (
                        <>
                            <Card className="mb-4">
                                <Card.Header as="h5">採点結果</Card.Header>
                                {crossTabData && crossTabData.rows.length > 0 ? (
                                    <Card.Body>
                                        <Table striped bordered hover responsive size="sm" className="text-center align-middle">
                                            <thead><tr>{crossTabData.headers.map((h: string) => <th key={h} className="text-nowrap">{h}</th>)}</tr></thead>
                                            <tbody>
                                                {crossTabData.rows.map((row, rIndex) => (
                                                    <tr key={rIndex} onClick={() => handleCommentPagination(row['採点者'] as string)} className={paginatedComments?.[0]?.evaluator === row['採点者'] ? 'table-primary' : ''} style={{cursor: 'pointer'}}>
                                                        {crossTabData.headers.map((h: string) => <td key={h}>{row[h]}</td>)}
                                                    </tr>
                                                ))}
                                                <tr className="table-group-divider">{crossTabData.headers.map((h: string) => <th key={h}>{crossTabData.averages[h]}</th>)}</tr>
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                ) : <Card.Body><Alert variant="light" className="mb-0">この月の評価データはありません。</Alert></Card.Body>}
                            </Card>

                            <Card className="mb-4">
                                <Card.Header as="h5">採点者コメント</Card.Header>
                                {paginatedComments && paginatedComments.length > 0 ? (
                                    <>
                                        <Card.Body>
                                            {paginatedComments.map((c, i) => (
                                                <div key={i}><strong>{c.evaluator}:</strong><p className="mt-2 p-3 bg-light rounded" style={{whiteSpace: 'pre-wrap'}}>{c.comment}</p></div>
                                            ))}
                                        </Card.Body>
                                        {totalCommentPages > 1 && <Card.Footer><Pagination className="mb-0 justify-content-center"><Pagination.Prev onClick={() => setCommentPage(p => Math.max(p - 1, 0))} disabled={commentPage === 0} /><Pagination.Item>{commentPage + 1} / {totalCommentPages}</Pagination.Item><Pagination.Next onClick={() => setCommentPage(p => Math.min(p + 1, totalCommentPages - 1))} disabled={commentPage >= totalCommentPages - 1} /></Pagination></Card.Footer>}
                                    </>
                                ) : <Card.Body className="text-center text-muted">この月のコメントはありません。</Card.Body>}
                            </Card>

                            <Row>
                                <Col md={6} className="mb-4">
                                    <Card className="h-100">
                                        <Card.Body className="text-center">
                                            <h4 className="mb-3">当月平均点 ({currentMonthAverage})</h4>
                                            <ReactECharts option={getOption('', eChartsRadarData.current, eChartsRadarData.indicator)} style={{ height: '300px' }} />
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6} className="mb-4">
                                    <Card className="h-100">
                                        <Card.Body className="text-center">
                                            <h4 className="mb-3">累計平均点 ({cumulativeAverage})</h4>
                                            <ReactECharts option={getOption('', eChartsRadarData.cumulative, eChartsRadarData.indicator)} style={{ height: '300px' }} />
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    ))}
            </main>
        </div>
    );
}
