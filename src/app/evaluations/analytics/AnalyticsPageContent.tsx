'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert, Table, Nav, Button, Pagination } from 'react-bootstrap';
import { CaretUpFill, CaretDownFill } from 'react-bootstrap-icons';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// --- Type Definitions ---
interface Evaluation { evaluator_name: string; scores_json: { [key: string]: number }; total_score: number; comment: string | null; month: string; }
interface Evaluator { id: number; name: string; }
interface ApiResponse {
    filterOptions: { months: string[]; targets: string[] };
    allEvaluations?: Evaluation[];
    potentialEvaluators?: Evaluator[];
}
interface ProcessedData {
    crossTabData: { headers: string[]; rows: any[]; averages: any };
    comments: { evaluator: string; comment: string | null }[];
    monthlySummary: { rawData: any[]; chartData: any };
    eChartsRadarData: { indicator: any[]; current: any[]; cumulative: any[] };
    currentMonthAverage: string;
    cumulativeAverage: string;
    selectedMonthLong: string;
}

const evaluationItemKeys = ['accuracy', 'discipline', 'cooperation', 'proactiveness', 'agility', 'judgment', 'expression', 'comprehension', 'interpersonal', 'potential'];
const evaluationItemLabels: { [key: string]: string } = { accuracy: '正確性', discipline: '規律性', cooperation: '協調性', proactiveness: '積極性', agility: '俊敏性', judgment: '判断力', expression: '表現力', comprehension: '理解力', interpersonal: '対人性', potential: '将来性' };
const MAX_TOTAL_SCORE = 55;

const formatMonth = (ym: string | null, format: 'long' | 'short') => {
    if (!ym) return '';
    const [year, month] = ym.split('-');
    return format === 'long' ? `${year}年${parseInt(month, 10)}月度` : `${parseInt(month, 10)}月`;
};

const getRadarOption = (chartData: any, indicator: any) => ({ radar: { indicator, shape: 'circle', center: ['50%', '55%'], radius: '65%', axisName: { color: '#333' } }, series: [{ type: 'radar', data: chartData, areaStyle: { opacity: 0.2 } }] });

export default function AnalyticsPageContent() {
    // --- State Management ---
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
    const [commentPage, setCommentPage] = useState(0);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchInitialOptions = async () => {
            try {
                const res = await axios.get<ApiResponse>(`/api/analytics/evaluations`);
                setApiResponse(res.data);
                if (res.data.filterOptions?.targets?.length > 0) {
                    setSelectedTarget(res.data.filterOptions.targets[0]);
                }
            } catch (err) { setError('初期データの読み込みに失敗しました。'); }
        };
        fetchInitialOptions();
    }, []);

    useEffect(() => {
        if (!selectedTarget) return;
        const fetchDataForTarget = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ target: selectedTarget });
                const res = await axios.get<ApiResponse>(`/api/analytics/evaluations?${params.toString()}`);
                setApiResponse(prev => ({ ...prev, ...res.data }));
            } catch (err) { setError('対象者データの読み込みに失敗しました。'); }
            finally { setLoading(false); }
        };
        fetchDataForTarget();
    }, [selectedTarget]);

    // --- Data Processing ---
    useEffect(() => {
        if (!apiResponse || !apiResponse.allEvaluations || !apiResponse.potentialEvaluators) return;

        const { allEvaluations, potentialEvaluators, filterOptions } = apiResponse;
        const selectedMonth = filterOptions.months[currentMonthIndex];
        const evaluationsForMonth = allEvaluations.filter(e => e.month === selectedMonth);

        // CrossTab
        const crossTabHeaders = ['採点者', ...evaluationItemKeys.map(k => evaluationItemLabels[k]), '合計点'];
        const crossTabRows = potentialEvaluators.map(user => {
            const evaluation = evaluationsForMonth.find(e => e.evaluator_name === user.name);
            const row: { [key: string]: string | number } = { '採点者': user.name };
            if (evaluation) {
                evaluationItemKeys.forEach(key => { row[evaluationItemLabels[key]] = evaluation.scores_json[key] || 0; });
                row['合計点'] = evaluation.total_score;
            } else {
                evaluationItemKeys.forEach(key => { row[evaluationItemLabels[key]] = '-'; });
                row['合計点'] = '-';
            }
            return row;
        });
        const submittedRows = crossTabRows.filter(r => r['合計点'] !== '-');
        const numEvaluators = submittedRows.length;
        const crossTabAverages = { '採点者': '平均点' } as { [key: string]: string | number };
        let grandTotal = 0;
        if (numEvaluators > 0) {
            const itemTotals = evaluationItemKeys.reduce((acc, key) => ({ ...acc, [evaluationItemLabels[key]]: 0 }), {} as { [key: string]: number });
            submittedRows.forEach(row => {
                evaluationItemKeys.forEach(key => { itemTotals[evaluationItemLabels[key]] += Number(row[evaluationItemLabels[key]]); });
                grandTotal += Number(row['合計点']);
            });
            evaluationItemKeys.forEach(key => { crossTabAverages[evaluationItemLabels[key]] = parseFloat((itemTotals[evaluationItemLabels[key]] / numEvaluators).toFixed(1)); });
            crossTabAverages['合計点'] = parseFloat((grandTotal / numEvaluators).toFixed(1));
        }

        // Comments
        const comments = evaluationsForMonth.map(e => ({ evaluator: e.evaluator_name, comment: e.comment || 'コメントはありません。' })).sort((a, b) => a.evaluator.localeCompare(b.evaluator));

        // Monthly Summary
        const monthlySummaryRaw = filterOptions.months.slice(0, 6).map(month => {
            const monthEvals = allEvaluations.filter(e => e.month === month);
            const monthNumEvals = monthEvals.length;
            if (monthNumEvals === 0) return null;
            const itemAvgs = evaluationItemKeys.reduce((acc, key) => {
                const total = monthEvals.reduce((sum, e) => sum + (e.scores_json[key] || 0), 0);
                return {...acc, [evaluationItemLabels[key]]: parseFloat((total/monthNumEvals).toFixed(1))};
            }, {} as {[key: string]: number});
            const totalAvg = parseFloat((monthEvals.reduce((sum, e) => sum + e.total_score, 0) / monthNumEvals).toFixed(1));
            return { month: formatMonth(month, 'short'), ...itemAvgs, '合計': totalAvg };
        }).filter(Boolean);

        // Radar Chart
        const eChartsIndicator = evaluationItemKeys.map(key => ({ name: evaluationItemLabels[key], max: key === 'potential' ? 10 : 5 }));
        const currentMonthValues = evaluationItemKeys.map(key => {
            const avg = crossTabAverages[evaluationItemLabels[key]] as number || 0;
            return key === 'potential' ? avg / 2 : avg;
        });
        const cumulativeValues = evaluationItemKeys.map(key => {
            const total = allEvaluations.reduce((sum, e) => sum + (e.scores_json[key] || 0), 0);
            const avg = allEvaluations.length > 0 ? total / allEvaluations.length : 0;
            return key === 'potential' ? avg / 2 : avg;
        });

        setProcessedData({
            crossTabData: { headers: crossTabHeaders, rows: crossTabRows, averages: crossTabAverages },
            comments,
            monthlySummary: { rawData: monthlySummaryRaw as any[], chartData: {} }, // chartData to be implemented
            eChartsRadarData: {
                indicator: eChartsIndicator,
                current: numEvaluators > 0 ? [{ value: currentMonthValues, name: '当月平均点' }] : [],
                cumulative: allEvaluations.length > 0 ? [{ value: cumulativeValues.map(v => parseFloat(v.toFixed(1))), name: '累計平均点' }] : []
            },
            currentMonthAverage: numEvaluators > 0 ? (grandTotal / numEvaluators / MAX_TOTAL_SCORE * 100).toFixed(1) : "0.0",
            cumulativeAverage: allEvaluations.length > 0 ? (allEvaluations.reduce((sum, e) => sum + e.total_score, 0) / allEvaluations.length / MAX_TOTAL_SCORE * 100).toFixed(1) : "0.0",
            selectedMonthLong: formatMonth(selectedMonth, 'long')
        });

    }, [apiResponse, currentMonthIndex]);

    // --- Event Handlers ---
    const handleTargetClick = (target: string) => { setSelectedTarget(target); setCurrentMonthIndex(0); setCommentPage(0); };
    const handlePrevMonth = () => { if (currentMonthIndex < (apiResponse?.filterOptions.months.length || 0) - 1) { setCurrentMonthIndex(p => p + 1); setCommentPage(0); } };
    const handleNextMonth = () => { if (currentMonthIndex > 0) { setCurrentMonthIndex(p => p - 1); setCommentPage(0); } };
    const handleCommentPagination = (evaluatorName: string) => {
        const pageIndex = processedData?.comments.findIndex(c => c.evaluator === evaluatorName);
        if (pageIndex !== undefined && pageIndex > -1) setCommentPage(pageIndex);
    };

    // --- Render Logic ---
    if (!processedData || !apiResponse) return <div className="text-center vh-100 d-flex flex-column align-items-center justify-content-center"><Spinner animation="border" /> <p className="mt-3">分析データを読み込み中...</p></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    const { filterOptions } = apiResponse;
    const { crossTabData, comments, eChartsRadarData, monthlySummary, currentMonthAverage, cumulativeAverage, selectedMonthLong } = processedData;
    const paginatedComments = comments?.slice(commentPage, commentPage + 1);
    const totalCommentPages = comments?.length || 0;

    return (
        <div style={{ display: 'flex' }}>
            <div style={{ width: '220px', position: 'fixed', top: '6rem', left: 'calc(16.66666667% + 1rem)', height: 'calc(100vh - 7rem)', overflowY: 'auto', paddingRight: '15px' }}>
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
                {loading ? <div className="text-center my-4"><Spinner animation="border" /></div> : (
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
                                            <tr className="table-group-divider fw-bold"><th className="text-nowrap">平均点</th>{crossTabData.headers.slice(1).map((h: string) => <th key={h}>{crossTabData.averages[h]}</th>)}</tr>
                                        </tbody>
                                    </Table>
                                ) : <Alert variant="light" className="mb-0">この月の評価データはありません。</Alert>}
                            </Card.Body>
                        </Card>
                        {/* Other components will be rendered here */}
                    </>
                )}
            </main>
        </div>
    );
}