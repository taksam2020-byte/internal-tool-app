'use client';

import { useState } from 'react';
import { Form, Button, Row, Col, Card, Modal, Alert, Spinner } from 'react-bootstrap';
import { useSettings } from '@/context/SettingsContext';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const fieldLabels: { [key: string]: string } = {
    applicant: '申請者',
    usageDate: '利用日',
    facility: '対象施設',
    equipment: '設備利用',
    startTime: '開始時間',
    endTime: '終了時間',
    purpose: '利用目的',
};

export default function ReservationsPage() {
  const { settings } = useSettings();
  const [validated, setValidated] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{success: boolean; message: string} | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  const handleWifiCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setShowWifiModal(true);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (form.checkValidity() === false || !startTime || !endTime) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    const formData = new FormData(form);
    const equipmentValues = formData.getAll('equipment');
    const data = Object.fromEntries(formData.entries());
    data.equipment = equipmentValues.join(', ');

    data.startTime = startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
    data.endTime = endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });

    const subject = '【社内ツール】施設予約申請';
    const body = Object.entries(data)
      .map(([key, value]) => {
        const label = fieldLabels[key] || key;
        if (key === 'equipment' && !value) return null;
        return `${label}: ${value}`;
      })
      .filter(Boolean)
      .join('\n');

    try {
      await axios.post('/api/send-email', {
        to: settings.reservationEmails,
        subject,
        body,
      });
      setSubmitStatus({ success: true, message: '申請が正常に送信されました。' });
      form.reset();
      setValidated(false);
      setStartTime(null);
      setEndTime(null);
    } catch (error) {
      setSubmitStatus({ success: false, message: '申請の送信に失敗しました。' });
    } finally {
      setIsSubmitting(false);
      setShowStatusModal(true);
    }
  };

  return (
    <div>
      <h1 className="mb-4">本社施設予約</h1>
      <Card className="mb-4">
        <Card.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit} id="reservation-form">
            <Row className="mb-3">
              <Form.Group as={Col} md="6">
                <Form.Label>申請者</Form.Label>
                <Form.Control required type="text" name="applicant" placeholder="山田 太郎" />
              </Form.Group>
              <Form.Group as={Col} md="6">
                <Form.Label>利用日</Form.Label>
                <Form.Control required type="date" name="usageDate" min={new Date().toISOString().split("T")[0]} />
              </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} md="6">
                    <Form.Label>対象施設</Form.Label>
                    <Form.Select required name="facility">
                        <option value="">選択してください...</option>
                        <option value="3Fホール(全)">3Fホール(全)</option>
                        <option value="3Fホール(北)">3Fホール(北)</option>
                        <option value="3Fホール(南)">3Fホール(南)</option>
                        <option value="3Fホール(中)">3Fホール(中)</option>
                        <option value="3F食堂">3F食堂</option>
                        <option value="2F応接室">2F応接室</option>
                        <option value="2Fカンファレンスルーム">2Fカンファレンスルーム</option>
                    </Form.Select>
                </Form.Group>
                <Form.Group as={Col} md="6">
                    <Form.Label>設備利用</Form.Label>
                    <div>
                        <Form.Check inline label="シャンプールーム" name="equipment" type="checkbox" value="シャンプールーム" />
                        <Form.Check inline label="Wi-Fi" name="equipment" type="checkbox" value="Wi-Fi" onChange={handleWifiCheck} />
                    </div>
                </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} md="6">
                    <Form.Label>開始時間 (準備含む)</Form.Label>
                    <DatePicker
                        selected={startTime}
                        onChange={(date: Date | null) => setStartTime(date)}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={30}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        timeFormat="HH:mm"
                        className="form-control"
                        required
                    />
                </Form.Group>
                <Form.Group as={Col} md="6">
                    <Form.Label>終了時間 (片付け含む)</Form.Label>
                    <DatePicker
                        selected={endTime}
                        onChange={(date: Date | null) => setEndTime(date)}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={30}
                        timeCaption="Time"
                        dateFormat="HH:mm"
                        timeFormat="HH:mm"
                        className="form-control"
                        required
                    />
                </Form.Group>
            </Row>

            <Form.Group>
                <Form.Label>利用目的</Form.Label>
                <Form.Control required as="textarea" name="purpose" rows={4} placeholder="〇〇セミナー" />
            </Form.Group>
          </Form>
        </Card.Body>
      </Card>

      <Alert variant="warning">
        <Alert.Heading as="h5">【注意事項】</Alert.Heading>
        <ul>
            <li>この申請をもって予約完了ではありません。予約の可否については、担当者より別途連絡いたします。</li>
            <li>3Fホール全体を使用する場合や夜間の利用時は、本社朝礼での共有が必要です。</li>
            <li>利用日の前日に、LINE WORKSへの投稿を担当者に依頼してください。</li>
        </ul>
      </Alert>

      <div className="d-grid">
        <Button variant="primary" type="submit" form="reservation-form" size="lg" disabled={isSubmitting}>
           {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : '申請する'}
        </Button>
      </div>

      <Modal show={showWifiModal} onHide={() => setShowWifiModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Wi-Fi利用について</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Wi-Fi利用については、本社IT業務部へ別途ご連絡ください。</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowWifiModal(false)}>
            分かりました。
          </Button>
        </Modal.Footer>
      </Modal>

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
