import { Textarea } from "@/components/ui/textarea";
import { StarRatingInput } from "../../../components/StarRating";
import type { TvShow } from "../../../types";
import { FormField, SwitchField } from "../../../components/FormFields";

interface TvShowReviewTabProps {
  formData: TvShow;
  setFormData: React.Dispatch<React.SetStateAction<TvShow>>;
}

// The TV show form's last tab: what you thought of it, like the movie form's. Rating and Watched
// each get a row of their own.
function TvShowReviewTab({ formData, setFormData }: TvShowReviewTabProps) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <FormField label="Rating">
        <StarRatingInput value={formData.rating} onChange={(rating) => setFormData({ ...formData, rating })} />
      </FormField>

      <FormField label="Watched">
        <SwitchField
          id="hasWatched"
          label={formData.hasWatched ? "Watched" : "Not watched yet"}
          checked={formData.hasWatched}
          onCheckedChange={(hasWatched) => setFormData({ ...formData, hasWatched })}
        />
      </FormField>

      <FormField label="Review / notes" htmlFor="review">
        <Textarea
          id="review"
          value={formData.review}
          onChange={(e) => setFormData({ ...formData, review: e.target.value })}
          rows={6}
          className="min-h-32"
        />
      </FormField>
    </div>
  );
}

export default TvShowReviewTab;
