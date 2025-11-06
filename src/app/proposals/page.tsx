'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    role: string;
    is_active: boolean;
    is_trainee: boolean;
}

let nextId = 1;

export default function ProposalsPage() {
  const { settings, isSettingsLoaded, isDirty, setIsDirty } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<User[]>([]);
  const [proposerName, setProposerName] = useState('');
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users');
            const roleOrder: { [key: string]: number } = { '社長': 1, '営業': 2, '内勤': 3, '営業研修生': 4, '内勤研修生': 5 };
            const sortedUsers = res.data.sort((a: User, b: User) => {
                const getSortKey = (user: User) => user.is_trainee ? `${user.role}研修生` : user.role;
                const orderA = roleOrder[getSortKey(a)] || 99;
                const orderB = roleOrder[getSortKey(b)] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return a.id - b.id;
            });
            setUsers(sortedUsers);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isSettingsLoaded) {
        setAllowedUsers(users.filter(user => {
            if (!user.is_active) return false;
            if (user.is_trainee && !settings.proposalIncludeTrainees) return false;
            return settings.proposalAllowedRoles.includes(user.role);
        }));
    }
  }, [users, settings.proposalAllowedRoles, settings.proposalIncludeTrainees, isSettingsLoaded]);

  const getDraftKey = useCallback(() => `proposalDraft-${settings.proposalYear}`, [settings.proposalYear]);

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
                    }
                }
            } else {
                setProposals(Array.from({ length: 5 }, (_, i) => ({ id: i, eventName: '', timing: '', type: '', content: '' })));
            }
        } catch (error) {
            console.error("Failed to load draft from localStorage", error);
            setProposals(Array.from({ length: 5 }, (_, i) => ({ id: i, eventName: '', timing: '', type: '', content: '' })));
        }
        setIsLoaded(true);
        setIsDirty(false);
    }
  }, [isSettingsLoaded, getDraftKey, settings.proposalYear]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const handleProposalChange = (index: number, field: keyof Omit<ProposalItem, 'id'>, value: string) => {
    const newProposals = proposals.map((p, i) => {
      if (i === index) {
        return { ...p, [field]: value };
      }
      return p;
    });
    setProposals(newProposals);
    setIsDirty(true);
  };

  const handleProposerChange = (selectedName: string) => {
    setProposerName(selectedName);
    setIsDirty(true);

    // --- Migration code ---
    const draftKey = getDraftKey();
    const oldDraftKey = `proposalDraft-${settings.proposalYear}-${selectedName}`;
    const oldSavedData = localStorage.getItem(oldDraftKey);

    if (oldSavedData) {
        if (window.confirm(`${selectedName}さんの過去の一時保存データが見つかりました。復元しますか？`)) {
            const { proposals: savedProposals } = JSON.parse(oldSavedData);
            if (savedProposals && savedProposals.length > 0) {
                setProposals(savedProposals);
                nextId = Math.max(...savedProposals.map((p: ProposalItem) => p.id)) + 1;
                
                const currentDraft = JSON.stringify({ year: settings.proposalYear, proposerName: selectedName, proposals: savedProposals });
                localStorage.setItem(draftKey, currentDraft);
                localStorage.removeItem(oldDraftKey);
                alert('データを復元しました。内容を確認し、再度「一時保存」を押してください。');
            }
        }
    }
    // --- End of migration code ---
  };

  const addProposal = () => {
    setProposals([...proposals, { id: nextId++, eventName: '', timing: '', type: '', content: '' }]);
    setIsDirty(true);
  };

  const removeProposal = (id: number) => {
    if (proposals.length > 1) {
        setProposals(proposals.filter(p => p.id !== id));
        setIsDirty(true);
    }
  };

  const handleSaveDraft = () => {
    try {
        const draft = JSON.stringify({ year: settings.proposalYear, proposerName, proposals });
        localStorage.setItem(getDraftKey(), draft);
        alert(`${settings.proposalYear}年度の提案を一時保存しました。`);
        setIsDirty(false);
    } catch (error) {
        console.error("Failed to save draft to localStorage", error);
        alert('一時保存に失敗しました。');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSettingsLoaded) {
        alert('設定を読み込み中です。少し待ってからもう一度お試しください。');
        return;
    }

    const filledProposals = proposals.filter(p => p.eventName || p.timing || p.type || p.content);

    if (!proposerName || filledProposals.length === 0) {
        alert('氏名と、最低1つの提案項目（企画名、時期、種別、内容）を入力してください。');
        return;
    }

    const allFilled = filledProposals.every(p => p.eventName && p.timing && p.type && p.content);
    if (!allFilled) {
        alert('入力された提案のすべての項目（企画名、時期、種別、内容）を埋めてください。');
        return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    const details: Record<string, string> = { proposal_year: settings.proposalYear };
    filledProposals.forEach((p, i) => {
        details[`提案${i+1}_企画名`] = p.eventName;
        details[`提案${i+1}_時期`] = p.timing;
        details[`提案${i+1}_種別`] = p.type;
        details[`提案${i+1}_内容`] = p.content;
    });

    try {
      await axios.post('/api/applications', { 
        application_type: 'proposal',
        applicant_name: proposerName,
        title: `${settings.proposalYear}年度 催事提案`,
        details: details,
        emails: settings.proposalEmails
      });
      setSubmitStatus({ success: true, message: '提案が正常に送信されました。' });
      setProposerName('');
      setProposals(Array.from({ length: 5 }, (_, i) => ({ id: i, eventName: '', timing: '', type: '', content: '' })));
      localStorage.removeItem(getDraftKey());
      setIsDirty(false);

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
      return (<div>読み込み中...</div>);
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
      {settings.proposalDeadline && 
        <Alert variant="danger">
            提出締切: {new Date(settings.proposalDeadline).toLocaleDateString('ja-JP')}
        </Alert>
      }
      <p>催事のアイデアを提案してください。項目は「+」ボタンで追加できます。</p>
      <Form onSubmit={handleSubmit} ref={formRef}>
        <Card className="mb-3">
            <Card.Body>
                <Form.Group as={Row} className="align-items-center">
                    <Form.Label column sm={2} className="fw-bold">氏名</Form.Label>
                    <Col sm={10}>
                        <Form.Select value={proposerName} onChange={(e) => handleProposerChange(e.target.value)}>
                            <option value="">選択してください...</option>
                            {allowedUsers.map(user => (
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
                    {proposals.length > 1 && (
                        <CloseButton onClick={() => removeProposal(proposal.id)} />
                    )}
                </div>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>企画(行事)名</Form.Label>
                <Form.Control type="text" placeholder="〇〇セミナー" value={proposal.eventName} onChange={(e) => handleProposalChange(index, 'eventName', e.target.value)} />
              </Form.Group>
              <Row>
                <Form.Group as={Col} md="6" className="mb-3">
                  <Form.Label>時期</Form.Label>
                  <Form.Control type="text" placeholder="〇月頃" value={proposal.timing} onChange={(e) => handleProposalChange(index, 'timing', e.target.value)} />
                </Form.Group>
                <Form.Group as={Col} md="6" className="mb-3">
                  <Form.Label>種別</Form.Label>
                  <Form.Select value={proposal.type} onChange={(e) => handleProposalChange(index, 'type', e.target.value)}>
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
                  <Form.Control as="textarea" rows={3} placeholder="具体的な内容を記入してください" value={proposal.content} onChange={(e) => handleProposalChange(index, 'content', e.target.value)} />
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