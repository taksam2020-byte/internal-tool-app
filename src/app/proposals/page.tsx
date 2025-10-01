'use client';

import { useState, useEffect, useCallback } from 'react';
import { Form, Button, Row, Col, Card, CloseButton, Alert, Spinner, Modal } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import axios from 'axios';

interface ProposalItem {
  id: number;
  eventName: string;
  timing: string;
  type: string;
  content: string;
}

interface User {
    id: number;
    name: string;
}

let nextId = 5;

export default function ProposalsPage() {
  const { settings, isSettingsLoaded } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [proposerName, setProposerName] = useState('');
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };
    fetchUsers();
  }, []);

  const getDraftKey = useCallback(() => `proposalDraft-${settings.proposalYear}-${proposerName || 'unknown'}`, [settings.proposalYear, proposerName]);

  useEffect(() => {
    if (isSettingsLoaded) {
        try {
            const draftKey = getDraftKey();
            const savedData = localStorage.getItem(draftKey);
            if (savedData) {
                const { proposerName: savedName, proposals: savedProposals, year: savedYear } = JSON.parse(savedData);
                if (savedYear === settings.proposalYear) {
                    setProposerName(savedName || '');
                    if (savedProposals && savedProposals.length > 0) {
                        setProposals(savedProposals);
                        nextId = Math.max(...savedProposals.map((p: ProposalItem) => p.id)) + 1;
                    } else {
                        setProposals(Array.from({ length: 5 }, (_, i) => ({ id: i, eventName: '', timing: '', type: '', content: '' })));
                    }
                } else {
                    // Year mismatch, clear old data
                    localStorage.removeItem(draftKey);
                    setProposerName('');
                    setProposals(Array.from({ length: 5 }, (_, i) => ({ id: i, eventName: '', timing: '', type: '', content: '' })));
                }
            } else {
              setProposals(Array.from({ length: 5 }, (_, i) => ({ id: i, eventName: '', timing: '', type: '', content: '' })));
            }
        } catch (error) {
            console.error("Failed to load draft from localStorage", error);
            setProposals(Array.from({ length: 5 }, (_, i) => ({ id: i, eventName: '', timing: '', type: '', content: '' })));
        }
        setIsLoaded(true);
    }
  }, [isSettingsLoaded, getDraftKey, settings.proposalYear]);

  const handleProposalChange = (index: number, field: keyof Omit<ProposalItem, 'id'>, value: string) => {
    const newProposals = proposals.map((p, i) => {
      if (i === index) {
        return { ...p, [field]: value };
      }
      return p;
    });
    setProposals(newProposals);
  };

  const addProposal = () => {
    setProposals([...proposals, { id: nextId++, eventName: '', timing: '', type: '', content: '' }]);
  };

  const removeProposal = (id: number) => {
    if (proposals.length > 5) {
        setProposals(proposals.filter(p => p.id !== id));
    }
  };

  const handleSaveDraft = () => {
    if (!proposerName) {
        alert('一時保存する前に氏名を入力してください。');
        return;
    }
    try {
        const draft = JSON.stringify({ year: settings.proposalYear, proposerName, proposals });
        localStorage.setItem(getDraftKey(), draft);
        alert(`${settings.proposalYear}年度の提案を一時保存しました。`);
    } catch (error) {
        console.error("Failed to save draft to localStorage", error);
        alert('一時保存に失敗しました。');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const allFilled = proposals.every(p => p.eventName && p.timing && p.type && p.content);

    if (!proposerName || !allFilled) {
        alert('氏名と、すべての提案項目（企画名、時期、種別、内容）を入力してください。');
        return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    const subject = `【社内ツール】${settings.proposalYear}年度 催事提案`;
    let body = `提案年度: ${settings.proposalYear}\n提案者: ${proposerName}\n\n`;
    body += proposals.map((p, i) => {
        return `--- 提案 ${i + 1} ---\n企画(行事)名: ${p.eventName}\n時期: ${p.timing}\n種別: ${p.type}\n内容: ${p.content}`;
    }).join('\n\n');

    try {
      await axios.post('/api/send-email', {
        to: settings.proposalEmails,
        subject,
        body,
      });
      setSubmitStatus({ success: true, message: '提案が正常に送信されました。' });
      setProposerName('');
      setProposals(Array.from({ length: 5 }, (_, i) => ({ id: i, eventName: '', timing: '', type: '', content: '' })));
      localStorage.removeItem(getDraftKey());
    } catch (error: unknown) {
      console.error("Failed to submit proposal", error);
      let errorMessage = '提案の送信に失敗しました。';
      if (axios.isAxiosError(error) && error.response) {
          errorMessage = error.response.data.error || errorMessage;
      }
      setSubmitStatus({ success: false, message: errorMessage });
    } finally {
      setIsSubmitting(false);
      setShowStatusModal(true);
    }
  };
  
  if (!isSettingsLoaded || !isLoaded) {
      return <div>読み込み中...</div>
  }

  if (!settings.isProposalOpen) {
      return (
          <div>
              <h1 className="mb-4">{settings.proposalYear}年度 催事提案</h1>
              <Alert variant="warning">現在、催事提案は受け付けていません。</Alert>
          </div>
      );
  }

  return (
    <div>
      <h1 className="mb-4">{settings.proposalYear}年度 催事提案</h1>
      <p>催事のアイデアを5つ以上提案してください。項目は「+」ボタンで追加できます。<br/>
          {settings.proposalDeadline && 
            <span className="fw-bold text-danger">締切: {new Date(settings.proposalDeadline).toLocaleDateString('ja-JP')}</span>
          }
      </p>
      <Form onSubmit={handleSubmit}>
        <Card className="mb-3">
            <Card.Body>
                <Form.Group as={Row} className="align-items-center">
                    <Form.Label column sm={2} className="fw-bold">氏名</Form.Label>
                    <Col sm={10}>
                        <Form.Select required value={proposerName} onChange={(e) => setProposerName(e.target.value)}>
                            <option value="">選択してください...</option>
                            {users.map(user => (
                                <option key={user.id} value={user.name}>{user.name}</option>
                            ))}
                        </Form.Select>
                    </Col>
                </Form.Group>
            </Card.Body>
        </Card>

        {proposals.map((proposal, index) => (
          <Card key={proposal.id} className="mb-3">
            <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                    <strong>提案 {index + 1}</strong>
                    {proposals.length > 5 && (
                        <CloseButton onClick={() => removeProposal(proposal.id)} />
                    )}
                </div>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>企画(行事)名</Form.Label>
                <Form.Control required type="text" placeholder="〇〇セミナー" value={proposal.eventName} onChange={(e) => handleProposalChange(index, 'eventName', e.target.value)} />
              </Form.Group>
              <Row>
                <Form.Group as={Col} md="6" className="mb-3">
                  <Form.Label>時期</Form.Label>
                  <Form.Control required type="text" placeholder="〇月頃" value={proposal.timing} onChange={(e) => handleProposalChange(index, 'timing', e.target.value)} />
                </Form.Group>
                <Form.Group as={Col} md="6" className="mb-3">
                  <Form.Label>種別</Form.Label>
                  <Form.Select required value={proposal.type} onChange={(e) => handleProposalChange(index, 'type', e.target.value)}>
                    <option value="">選択してください...</option>
                    <option value="セミナー">セミナー</option>
                    <option value="イベント(サロン様向け)">イベント(サロン様向け)</option>
                    <option value="社内行事">社内行事</option>
                    <option value="キャンペーン">キャンペーン</option>
                    <option value="その他">その他</option>
                  </Form.Select>
                </Form.Group>
              </Row>
              <Row>
                <Form.Group as={Col}>
                  <Form.Label>内容</Form.Label>
                  <Form.Control required as="textarea" rows={3} placeholder="具体的な内容を記入してください" value={proposal.content} onChange={(e) => handleProposalChange(index, 'content', e.target.value)} />
                </Form.Group>
              </Row>
            </Card.Body>
          </Card>
        ))}

        <div className="d-flex justify-content-between mb-3">
            <Button variant="success" onClick={handleSaveDraft}>一時保存</Button>
            <Button variant="secondary" onClick={addProposal}>+ 項目を追加</Button>
        </div>
        
        <div className="d-grid">
            <Button variant="primary" type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : 'すべての提案を提出する'}
            </Button>
        </div>
      </Form>

      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{submitStatus?.success ? '送信完了' : '送信エラー'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{submitStatus?.message}</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowStatusModal(false)}>
            閉じる
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}