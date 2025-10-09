'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Nav, Button, Pagination } from 'react-bootstrap';
import { CaretUpFill, CaretDownFill } from 'react-bootstrap-icons';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';

// Type Definitions (matching the new simplified API response)
interface EChartsRadarData { indicator: { name: string; max: number }[]; current: { value: number[]; name: string }[]; cumulative: { value: number[]; name: string }[]; }
interface MonthlySummary { labels: string[]; datasets: { label: string; data: number[]; borderColor: string; backgroundColor: string; }[]; rawData: { [key: string]: string | number }[] }
interface AnalyticsData {
    crossTabData?: { headers: string[]; rows: { [key: string]: string | number }[]; averages: { [key: string]: string | number } };
    comments?: { evaluator: string; comment: string }[];
    eChartsRadarData?: EChartsRadarData;
    monthlySummary?: MonthlySummary;
    currentMonthAverage?: string;
    cumulativeAverage?: string;
    filterOptions: { months: string[]; targets: string[] };
    selectedMonth?: string;
    selectedMonthLong?: string;
}

const initialData: AnalyticsData = {
    filterOptions: { months: [], targets: [] },
};

export default function AnalyticsPageContent() {
    const [data, setData] = useState<AnalyticsData>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
    const [commentPage, setCommentPage] = useState(0);

    // 1. Fetch filter options on initial load
    useEffect(() => {
        const fetchOptions = async () => {
            setLoading(true);
            try {
                const res = await axios.get<AnalyticsData>(`/api/analytics/evaluations`);
                setData(res.data);
                if (res.data.filterOptions?.targets?.length > 0) {
                    setSelectedTarget(res.data.filterOptions.targets[0]);
                }
            } catch (err) {
                setError('初期データの読み込みに失敗しました。');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOptions();
    }, []);

    // 2. Fetch analytics data when filters change
    useEffect(() => {
        if (!selectedTarget || !data.filterOptions.months.length) return;

        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams({
                    target: selectedTarget,
                    month: data.filterOptions.months[currentMonthIndex],
                    _t: new Date().getTime().toString() // Cache-busting parameter
                });
                const res = await axios.get<AnalyticsData>(`/api/analytics/evaluations?${params.toString()}`);
                setData(prevData => ({ ...prevData, ...res.data })); // Merge new data with existing filterOptions
            } catch (err) {
                setError('分析データの読み込みに失敗しました。');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedTarget, currentMonthIndex]);

    const handleTargetClick = (target: string) => { setSelectedTarget(target); setCurrentMonthIndex(0); setCommentPage(0); };
    const handlePrevMonth = () => { if (currentMonthIndex < data.filterOptions.months.length - 1) { setCurrentMonthIndex(p => p + 1); setCommentPage(0); } };
    const handleNextMonth = () => { if (currentMonthIndex > 0) { setCurrentMonthIndex(p => p - 1); setCommentPage(0); } };
    const handleCommentPagination = (evaluatorName: string) => {
        const pageIndex = data.comments?.findIndex(c => c.evaluator === evaluatorName);
        if (pageIndex !== undefined && pageIndex > -1) setCommentPage(pageIndex);
    };

    const getRadarOption = (chartData: { value: number[], name: string }[], indicator: { name: string, max: number }[]) => ({ radar: { indicator, shape: 'circle', center: ['50%', '55%'], radius: '65%', axisName: { color: '#333' } }, series: [{ type: 'radar', data: chartData, areaStyle: { opacity: 0.2 } }] });
    const lineChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' as const, onClick: () => {} } } };

    const { crossTabData, comments, eChartsRadarData, monthlySummary, currentMonthAverage, cumulativeAverage, filterOptions, selectedMonthLong } = data;
    const crossTabAverages = crossTabData?.averages; // Extract averages
    const paginatedComments = comments?.slice(commentPage, commentPage + 1);
    const totalCommentPages = comments?.length || 0;

    return (
        <div style={{ display: 'flex' }}>
            <div style={{ width: '220px', position: 'fixed', top: '6rem', left: 'calc(16.66666667% + 1rem)', height: 'calc(100vh - 7rem)', overflowY: 'auto', paddingRight: '15px' }}>
                <Card className="text-center mb-4">
                    <Card.Header>月度</Card.Header>
                    <Card.Body>
                        <Button variant="link" onClick={handleNextMonth} disabled={loading || currentMonthIndex <= 0} className="p-0 text-decoration-none"><CaretUpFill size={24} /></Button>
                        <h5 className="my-2">{selectedMonthLong || (filterOptions.months.length > 0 ? formatMonth(filterOptions.months[currentMonthIndex], 'long') : 'N/A')}</h5>
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
                {error && <Alert variant="danger">{error}</Alert>}
                {!loading && !error && selectedTarget && (
                    <>
                        <Card className="mb-4">
                            <Card.Header as="h5">採点結果</Card.Header>
                            <Card.Body>
                                {crossTabData && crossTabData.rows.length > 0 ? (
                                    <Table striped bordered hover responsive size="sm" className="text-center align-middle">
                                        <thead><tr>{crossTabData.headers.map((h: string) => <th key={h} className="text-nowrap">{h}</th>)}</tr></thead>
                                        <tbody>
                                            {crossTabData.rows.map((row, rIndex) => (
                                                <tr key={rIndex} onClick={() => handleCommentPagination(row['採点者'] as string)} className={paginatedComments?.[0]?.evaluator === row['採点者'] ? 'table-primary' : ''} style={{cursor: 'pointer'}}>
                                                    {crossTabData.headers.map((h: string) => <td key={h}>{row[h]}</td>)}
                                                </tr>
                                            ))}
                                            <tr className="table-group-divider fw-bold"><th className="text-nowrap">平均点</th>{crossTabData.headers.slice(1).map((h: string) => <th key={h}>{crossTabAverages?.[h]}</th>)}</tr>
                                        </tbody>
                                    </Table>
                                ) : <Alert variant="light" className="mb-0">この月の評価データはありません。</Alert>}
                            </Card.Body>
                        </Card>

                        <Card className="mb-4">
                            <Card.Header as="h5">採点者コメント</Card.Header>
                            <Card.Body>
                                {paginatedComments && paginatedComments.length > 0 ? (
                                    <>
                                        {paginatedComments.map((c, i) => (
                                            <div key={i}><strong>{c.evaluator}:</strong><div className="mt-2 p-3 bg-light rounded" style={{whiteSpace: 'pre-wrap'}}>{c.comment}</div></div>
                                        ))}
                                    </>
                                ) : <div className="text-center text-muted">この月のコメントはありません。</div>}
                            </Card.Body>
                            {totalCommentPages > 1 && <Card.Footer><Pagination className="mb-0 justify-content-center"><Pagination.Prev onClick={() => setCommentPage(p => Math.max(p - 1, 0))} disabled={commentPage === 0} /><Pagination.Item>{commentPage + 1} / {totalCommentPages}</Pagination.Item><Pagination.Next onClick={() => setCommentPage(p => Math.min(p + 1, totalCommentPages - 1))} disabled={commentPage >= totalCommentPages - 1} /></Pagination></Card.Footer>}
                        </Card>

                        <Card className="mb-4">
                            <Card.Header as="h5">項目別平均点の月次推移</Card.Header>
                            <Card.Body>
                                {monthlySummary?.rawData && monthlySummary.rawData.length > 0 ? (
                                    <>
                                        <Table striped bordered hover responsive size="sm" className="text-center align-middle">
                                            <thead>
                                                <tr>
                                                    <th>月</th>
                                                    {Object.keys(monthlySummary.rawData[0]).filter(k => k !== 'month').map(key => <th key={key}>{key}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {monthlySummary.rawData.map((row, rIndex) => (
                                                    <tr key={rIndex}>
                                                        {Object.values(row).map((val: string | number, cIndex) => <td key={cIndex}>{val}</td>)}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                        {/* <div style={{ position: 'relative', height: '300px' }} className="mt-4">
                                            <Line options={lineChartOptions} data={monthlySummary} />
                                        </div> */}
                                    </>
                                ) : <Alert variant="light" className="mb-0">月次データがありません。</Alert>}
                            </Card.Body>
                        </Card>

                        <Row>
                            <Col md={6} className="mb-4">
                                <Card className="h-100 text-center">
                                    <Card.Header as="h5">当月平均点 (100点換算)</Card.Header>
                                    <Card.Body>
                                        <h2 className="display-4 fw-bold">{currentMonthAverage}</h2>
                                        {eChartsRadarData?.current && <ReactECharts option={getRadarOption(eChartsRadarData.current, eChartsRadarData.indicator)} style={{ height: '300px' }} />}
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={6} className="mb-4">
                                <Card className="h-100 text-center">
                                    <Card.Header as="h5">累計平均点 (100点換算)</Card.Header>
                                    <Card.Body>
                                        <h2 className="display-4 fw-bold">{cumulativeAverage}</h2>
                                        {eChartsRadarData?.cumulative && <ReactECharts option={getRadarOption(eChartsRadarData.cumulative, eChartsRadarData.indicator)} style={{ height: '300px' }} />}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                        
                        <Alert variant="light" className="text-center small">
                            ※グラフおよびレーダーチャート内の「将来性」項目は、他の項目との比較のため5点満点に換算して表示しています。
                        </Alert>
                    </>
                )}
            </main>
        </div>
    );
}

function formatMonth(ym: string, format: 'long' | 'short') {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    return format === 'long' ? `${year}年${parseInt(month, 10)}月度` : `${parseInt(month, 10)}月`;
}