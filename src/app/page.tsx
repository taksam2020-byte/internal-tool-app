'use client';

import { useState, useEffect } from 'react';
import { Card, Col, Row, Badge } from 'react-bootstrap';
import Link from 'next/link';
import { useSettings } from '@/context/SettingsContext';
import { PersonPlus, Building, Lightbulb, GearFill, PencilSquare, BarChart, ClockHistory, CalendarWeek, FileEarmarkText } from 'react-bootstrap-icons';
import axios from 'axios';

import Image from 'next/image';

interface MenuItem {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  bg?: string;
  style?: React.CSSProperties;
  show: boolean;
  badge?: number | null;
  isExternal?: boolean;
}

export default function HomePage() {
  const { settings, isSettingsLoaded } = useSettings();
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);

  useEffect(() => {
    const fetchPendingApplications = async () => {
      try {
        const appTypes = ['customer_registration', 'customer_change', 'facility_reservation'];
        const res = await axios.get(`/api/applications?status=未処理&type=${appTypes.join(',')}`);
        setPendingApplicationsCount(res.data.length);
      } catch (error) {
        console.error("Failed to fetch pending applications", error);
      }
    };

    if (isSettingsLoaded) {
        fetchPendingApplications();
    }
  }, [isSettingsLoaded]);

  const menuItems: MenuItem[] = [
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
      href: '/history',
      title: '申請履歴',
      description: '各種申請の履歴とステータスを確認します。',
      icon: <ClockHistory size={40} />,
      style: { backgroundColor: '#6f42c1' },
      badge: pendingApplicationsCount > 0 ? pendingApplicationsCount : null,
      show: true
    },
    {
      href: '/approval-form',
      title: 'サンプル申請',
      description: '承認印欄付きの申請書を作成・印刷します。',
      icon: <FileEarmarkText size={40} />,
      bg: 'warning',
      show: settings.show_approval_form_menu
    },
    {
      href: '/proposals',
      title: '催事提案',
      description: '新しい催事のアイデアを提案します。',
      icon: <Lightbulb size={40} />,
      style: { backgroundColor: '#ff8c00' },
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
        style: { backgroundColor: '#6f42c1' },
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
    {
        href: 'https://shift-management-app-sage.vercel.app/',
        title: 'シフト管理',
        description: 'シフト管理アプリへ移動します。',
        icon: <CalendarWeek size={40} />,
        bg: 'info',
        isExternal: true, // Mark as external link
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
      <Row xs={1} md={2} lg={3} className="g-4">
        {menuItems.filter(item => item.show).map((item, idx) => (
          <Col key={idx}>
            {item.isExternal ? (
                <Card as="a" href={item.href} target="_blank" rel="noopener noreferrer" bg={item.bg} text="white" style={item.style} className="h-100 text-decoration-none position-relative">
                    {item.badge && <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle">{item.badge}</Badge>}
                    <Card.Body className="d-flex align-items-center">
                      <div className="me-3">{item.icon}</div>
                      <div>
                        <Card.Title as="h5">{item.title}</Card.Title>
                        <Card.Text>{item.description}</Card.Text>
                      </div>
                    </Card.Body>
                </Card>
            ) : (
                <Link href={item.href} passHref legacyBehavior>
                  <Card as="a" bg={item.bg} text="white" style={item.style} className="h-100 text-decoration-none position-relative">
                    {item.badge && <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle">{item.badge}</Badge>}
                    <Card.Body className="d-flex align-items-center">
                      <div className="me-3">{item.icon}</div>
                      <div>
                        <Card.Title as="h5">{item.title}</Card.Title>
                        <Card.Text>{item.description}</Card.Text>
                      </div>
                    </Card.Body>
                  </Card>
                </Link>
            )}
          </Col>
        ))}
      </Row>
    </div>
  );
}
