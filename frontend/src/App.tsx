import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  Upload,
  Form,
  Select,
  InputNumber,
  Switch,
  Typography,
  Space,
  Divider,
  message,
  Progress,
  Tag,
  Descriptions,
  Alert,
  Row,
  Col,
  Empty,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  YoutubeOutlined,
  UploadOutlined,
  FileTextOutlined,
  DownloadOutlined,
  DeleteOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  PictureOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  submitYouTube,
  uploadVideo,
  getJobStatus,
  downloadVideoUrl,
  downloadSummaryUrl,
  deleteJob,
} from './api';
import type { JobStatus, YouTubeRequest } from './api';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const WHISPER_MODELS = [
  { value: 'tiny', label: 'Tiny' },
  { value: 'base', label: 'Base' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const GEMMA_MODELS = [
  { value: 'google/gemma-3-4b-it', label: 'Gemma 3 4B IT' },
  { value: 'google/gemma-3-12b-it', label: 'Gemma 3 12B IT' },
  { value: 'google/gemma-3-27b-it', label: 'Gemma 3 27B IT' },
  { value: 'google/gemma-3-4b-pt', label: 'Gemma 3 4B PT' },
];

interface StatusInfo {
  color: string;
  icon: React.ReactNode;
  text: string;
}

const STATUS_MAP: Record<string, StatusInfo> = {
  downloading: { color: 'processing', icon: <DownloadOutlined />, text: 'Загрузка видео' },
  uploading: { color: 'processing', icon: <UploadOutlined />, text: 'Загрузка файла' },
  transcribing: { color: 'processing', icon: <SoundOutlined />, text: 'Транскрибация аудио' },
  extracting_frames: { color: 'processing', icon: <PictureOutlined />, text: 'Извлечение кадров' },
  summarizing: { color: 'processing', icon: <RobotOutlined />, text: 'Генерация summary' },
  completed: { color: 'success', icon: <CheckCircleOutlined />, text: 'Завершено' },
  saved: { color: 'success', icon: <CheckCircleOutlined />, text: 'Сохранено' },
  completed_but_not_saved: { color: 'warning', icon: <ExclamationCircleOutlined />, text: 'Завершено (не сохранено)' },
  failed: { color: 'error', icon: <ExclamationCircleOutlined />, text: 'Ошибка' },
};

// ---------- YouTube Form ----------

interface YouTubeFormProps {
  onJobCreated: (job: JobStatus) => void;
}

function YouTubeForm({ onJobCreated }: YouTubeFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: YouTubeRequest & { url: string }) => {
    setLoading(true);
    try {
      const payload: YouTubeRequest = {
        url: values.url,
        whisper_model: values.whisper_model || 'base',
        frame_rate: values.frame_rate || 1,
        max_frames: values.max_frames || 5,
        max_tokens: values.max_tokens || 500,
        model_name: values.model_name || 'google/gemma-3-4b-it',
        cleanup: values.cleanup !== false,
      };
      const res = await submitYouTube(payload);
      message.success('Видео отправлено на обработку!');
      onJobCreated(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr.response?.data?.detail || (err as Error).message;
      message.error(`Ошибка: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <YoutubeOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
          <span>YouTube видео</span>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          whisper_model: 'base',
          frame_rate: 1,
          max_frames: 5,
          max_tokens: 500,
          model_name: 'google/gemma-3-4b-it',
          cleanup: true,
        }}
      >
        <Form.Item
          name="url"
          label="Ссылка на YouTube"
          rules={[
            { required: true, message: 'Введите URL YouTube видео' },
            { type: 'url', message: 'Введите корректный URL' },
          ]}
        >
          <Input
            prefix={<LinkOutlined />}
            placeholder="https://www.youtube.com/watch?v=..."
            size="large"
          />
        </Form.Item>

        <Divider plain>Настройки обработки</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="whisper_model" label="Модель Whisper">
              <Select options={WHISPER_MODELS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="model_name" label="Модель Gemma">
              <Select options={GEMMA_MODELS} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="frame_rate" label="Frame rate (fps)">
              <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="max_frames" label="Макс. кадров">
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="max_tokens" label="Макс. токенов">
              <InputNumber min={100} max={2000} step={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="cleanup" label="Удалять временные файлы" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          icon={<YoutubeOutlined />}
          size="large"
          block
        >
          Обработать YouTube видео
        </Button>
      </Form>
    </Card>
  );
}

// ---------- Upload Form ----------

interface UploadFormProps {
  onJobCreated: (job: JobStatus) => void;
}

function UploadForm({ onJobCreated }: UploadFormProps) {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Выберите видеофайл');
      return;
    }

    const values = form.getFieldsValue();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as Blob);
      formData.append('whisper_model', values.whisper_model || 'base');
      formData.append('frame_rate', String(values.frame_rate || 1));
      formData.append('max_frames', String(values.max_frames || 5));
      formData.append('max_tokens', String(values.max_tokens || 500));
      formData.append('model_name', values.model_name || 'google/gemma-3-4b-it');
      formData.append('cleanup', values.cleanup !== false ? 'true' : 'false');

      const res = await uploadVideo(formData);
      message.success('Видео загружено и отправлено на обработку!');
      onJobCreated(res.data);
      setFileList([]);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr.response?.data?.detail || (err as Error).message;
      message.error(`Ошибка: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <Space>
          <UploadOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span>Загрузка файла</span>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          whisper_model: 'base',
          frame_rate: 1,
          max_frames: 5,
          max_tokens: 500,
          model_name: 'google/gemma-3-4b-it',
          cleanup: true,
        }}
      >
        <Form.Item label="Видеофайл">
          <Dragger
            onRemove={() => setFileList([])}
            beforeUpload={(file) => {
              const isVideo = file.type.startsWith('video/');
              if (!isVideo) {
                message.error('Можно загружать только видеофайлы!');
                return Upload.LIST_IGNORE;
              }
              setFileList([file]);
              return false;
            }}
            fileList={fileList}
            maxCount={1}
            accept="video/*"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Нажмите или перетащите видеофайл сюда</p>
            <p className="ant-upload-hint">
              Поддерживаются MP4, AVI, MOV, MKV и другие форматы
            </p>
          </Dragger>
        </Form.Item>

        <Divider plain>Настройки обработки</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="whisper_model" label="Модель Whisper">
              <Select options={WHISPER_MODELS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="model_name" label="Модель Gemma">
              <Select options={GEMMA_MODELS} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="frame_rate" label="Frame rate (fps)">
              <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="max_frames" label="Макс. кадров">
              <InputNumber min={1} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="max_tokens" label="Макс. токенов">
              <InputNumber min={100} max={2000} step={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="cleanup" label="Удалять временные файлы" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          icon={<UploadOutlined />}
          size="large"
          block
          onClick={handleUpload}
          disabled={fileList.length === 0}
        >
          Загрузить и обработать
        </Button>
      </Form>
    </Card>
  );
}

// ---------- Job Status Card ----------

interface JobStatusCardProps {
  job: JobStatus;
  onComplete?: (job: JobStatus) => void;
  onDelete?: (jobId: string) => void;
}

function JobStatusCard({ job: initialJob, onComplete, onDelete }: JobStatusCardProps) {
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<JobStatus>(initialJob);
  const [deleting, setDeleting] = useState(false);

  const isFinal = ['completed', 'saved', 'completed_but_not_saved', 'failed'].includes(status.status);

  useEffect(() => {
    if (!isFinal && status.job_id) {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await getJobStatus(status.job_id);
          const updated = res.data;
          setStatus(updated);
          if (['completed', 'saved', 'completed_but_not_saved', 'failed'].includes(updated.status)) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (onComplete) onComplete(updated);
          }
        } catch {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }, 2000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [status.job_id, isFinal, onComplete]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteJob(status.job_id);
      message.success('Задача удалена');
      if (onDelete) onDelete(status.job_id);
    } catch {
      message.error('Ошибка при удалении');
    } finally {
      setDeleting(false);
    }
  };

  const statusInfo = STATUS_MAP[status.status] || {
    color: 'default',
    icon: <ClockCircleOutlined />,
    text: status.status,
  };

  const progressPercent = Math.round((status.progress || 0) * 100);

  return (
    <Card
      title={
        <Space>
          <Tag icon={statusInfo.icon} color={statusInfo.color}>
            {statusInfo.text}
          </Tag>
          <Text code>{status.job_id}</Text>
        </Space>
      }
      extra={
        isFinal ? (
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
            onClick={handleDelete}
            size="small"
          >
            Удалить
          </Button>
        ) : null
      }
    >
      {!isFinal && (
        <div style={{ marginBottom: 16 }}>
          <Progress
            percent={progressPercent}
            status={status.status === 'failed' ? 'exception' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 4 }}>
            {statusInfo.text} — {progressPercent}%
          </Text>
        </div>
      )}

      {status.status === 'failed' && status.error && (
        <Alert
          message="Ошибка обработки"
          description={status.error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {status.result && (
        <>
          {status.result.video_info && (
            <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
              {status.result.video_info.filename && (
                <Descriptions.Item label="Файл" span={2}>
                  {status.result.video_info.filename}
                </Descriptions.Item>
              )}
              {status.result.video_info.duration && (
                <Descriptions.Item label="Длительность">
                  {status.result.video_info.duration}
                </Descriptions.Item>
              )}
              {status.result.video_info.size && (
                <Descriptions.Item label="Размер">
                  {status.result.video_info.size}
                </Descriptions.Item>
              )}
              {status.result.video_info.resolution && (
                <Descriptions.Item label="Разрешение" span={2}>
                  {status.result.video_info.resolution}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}

          <div style={{ marginBottom: 16 }}>
            <Title level={5}>
              <FileTextOutlined /> Summary
            </Title>
            <Paragraph
              style={{
                background: '#f6f8fa',
                padding: 16,
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
                maxHeight: 300,
                overflow: 'auto',
                border: '1px solid #e8e8e8',
              }}
            >
              {status.result.summary || 'Summary не доступно'}
            </Paragraph>
          </div>

          <Space wrap>
            {status.result.summary_file && (
              <Button
                icon={<DownloadOutlined />}
                href={downloadSummaryUrl(status.job_id)}
                target="_blank"
              >
                Скачать summary (.txt)
              </Button>
            )}
            {status.video_path && (
              <Button
                icon={<VideoCameraOutlined />}
                href={downloadVideoUrl(status.job_id)}
                target="_blank"
              >
                Скачать видео
              </Button>
            )}
          </Space>
        </>
      )}

      {isFinal && !status.result && status.status !== 'failed' && (
        <Empty description="Результаты не найдены" />
      )}
    </Card>
  );
}

// ---------- App ----------

function App() {
  const [jobs, setJobs] = useState<JobStatus[]>([]);

  const handleJobCreated = (jobData: JobStatus) => {
    setJobs((prev) => [jobData, ...prev]);
  };

  const handleJobDelete = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
  };

  const handleJobComplete = (updatedJob: JobStatus) => {
    setJobs((prev) =>
      prev.map((j) => (j.job_id === updatedJob.job_id ? updatedJob : j))
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px 0',
          marginBottom: 24,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <Space align="center" size={16}>
            <VideoCameraOutlined style={{ fontSize: 36, color: '#fff' }} />
            <div>
              <Title level={2} style={{ color: '#fff', margin: 0 }}>
                Video Summarizer
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                Создавайте краткие summary видео с помощью AI
              </Text>
            </div>
          </Space>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>
        {/* Input Forms */}
        <Row gutter={24} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12} style={{ marginBottom: 24 }}>
            <YouTubeForm onJobCreated={handleJobCreated} />
          </Col>
          <Col xs={24} lg={12} style={{ marginBottom: 24 }}>
            <UploadForm onJobCreated={handleJobCreated} />
          </Col>
        </Row>

        {/* Jobs List */}
        <Card
          title={
            <Space>
              <ClockCircleOutlined />
              <span>Задачи на обработку</span>
              {jobs.length > 0 && <Tag color="blue">{jobs.length}</Tag>}
            </Space>
          }
        >
          {jobs.length === 0 ? (
            <Empty
              description="Нет активных задач. Отправьте YouTube ссылку или загрузите видео."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {jobs.map((job) => (
                <Col xs={24} key={job.job_id}>
                  <JobStatusCard
                    job={job}
                    onComplete={handleJobComplete}
                    onDelete={handleJobDelete}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Card>
      </div>
    </div>
  );
}

export default App;
