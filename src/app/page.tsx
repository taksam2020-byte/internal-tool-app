'use client';

import { Card, Col, Row } from 'react-bootstrap';
import Link from 'next/link';
import { useSettings } from '@/context/SettingsContext';
import { PersonPlus, Building, Lightbulb, GearFill, PencilSquare, BarChart } from 'react-bootstrap-icons';

import Image from 'next/image';

export default function HomePage() {
  const { settings, isSettingsLoaded } = useSettings();

  const menuItems = [
    {
      href: '/customers',
      title: '得意先登録',
      description: '新しい得意先の登録や既存情報の変更申請を行います。',
      icon: <PersonPlus size={40} />,
      bg: 'primary',
      show: true
    },
    {
      href: '/reservations',
      title: '本社施設予約',
      description: '本社施設の利用予約を申請します。',
      icon: <Building size={40} />,
      bg: 'success',
      show: true
    },
    {
      href: '/proposals',
      title: '催事提案',
      description: '新しい催事のアイデアを提案します。',
      icon: <Lightbulb size={40} />,
      style: { backgroundColor: '#ff8c00', color: '#ffffff' },
      show: settings.isProposalOpen
    },
    {
        href: '/evaluations',
        title: '新人考課',
        description: '新入社員の評価を入力します。',
        icon: <PencilSquare size={40} />,
        bg: 'info',
        show: settings.isEvaluationOpen
    },
    {
        href: '/evaluations/analytics',
        title: '考課結果閲覧',
        description: '新人考課の集計結果を閲覧します。',
        icon: <BarChart size={40} />,
        style: { backgroundColor: '#6f42c1', color: '#ffffff' },
        show: settings.isEvaluationOpen
    },
    {
      href: '/admin',
      title: '管理画面',
      description: 'アプリケーション全体の設定を管理します。',
      icon: <GearFill size={40} />,
      bg: 'secondary',
      show: true
    },
  ];

  if (!isSettingsLoaded) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <h1 className="mb-4 d-flex align-items-center">
        <Image src="/logo.png" alt="Logo" width={50} height={50} className="me-3" />
        <span>社内ツール</span>
      </h1>
      <Row xs={1} md={2} className="g-4">
        {menuItems.filter(item => item.show).map((item, idx) => (
          <Col key={idx}>
            <Link href={item.href} passHref legacyBehavior>
              <Card as="a" {...(item.bg && {bg: item.bg})} text="white" className="h-100 text-decoration-none" style={item.style}>
                <Card.Body className="d-flex align-items-center">
                  <div className="me-3">{item.icon}</div>
                  <div>
                    <Card.Title as="h5">{item.title}</Card.Title>
                    <Card.Text>{item.description}</Card.Text>
                  </div>
                </Card.Body>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}