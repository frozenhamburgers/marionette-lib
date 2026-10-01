package net.jelly.marionette_lib.utility;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import net.minecraft.client.model.EntityModel;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.model.geom.builders.PartDefinition;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.entity.PartEntity;
import org.joml.Quaternionf;
import org.joml.Vector3f;

public abstract class MarionetteModel<T extends Entity> extends EntityModel<T> {
    private static final Quaternionf AXIS_FLIP = new Quaternionf().rotationX(Mth.PI);
    private static final Quaternionf HALF_TURN_Z = new Quaternionf().rotationZ(Mth.PI);

    /** array of model parts corresponding to segment names */
    protected ModelPart[] allSegments;

    public static LayerDefinition createBodyLayer() {
        MeshDefinition meshdefinition = new MeshDefinition();
        PartDefinition partdefinition = meshdefinition.getRoot();

        // Set up parts corresponding to segment names. If you initialize segmentNames with the
        // same names as the parts in Blockbench, you should be fine, e.g.:
        //
        // PartDefinition segment1 = partdefinition.addOrReplaceChild("segment1",
        //     CubeListBuilder.create().texOffs(0, 0).addBox(-1.0F, -2.0F, -1.0F, 2.0F, 2.0F, 4.0F, new CubeDeformation(0.0F)),
        //     PartPose.offset(0.0F, 24.0F, 0.0F));

        return LayerDefinition.create(meshdefinition, 16, 16);
    }

    /**
     * @param segmentNames names of the folders containing the geometry of each animatable segment
     *                      in Blockbench. The index of a name corresponds to the part entity at the
     *                      same index in the multipart entity's part list.
     */
    public MarionetteModel(ModelPart root, String[] segmentNames) {
        allSegments = new ModelPart[segmentNames.length];
        for (int i = 0; i < segmentNames.length; i++) {
            allSegments[i] = root.getChild(segmentNames[i]);
        }
    }

    @Override
    public void renderToBuffer(PoseStack poseStack, VertexConsumer vertexConsumer, int packedLight, int packedOverlay, float red, float green, float blue, float alpha) {
        for (ModelPart segment : allSegments) {
            segment.render(poseStack, vertexConsumer, packedLight, packedOverlay, red, green, blue, alpha);
        }
    }

    /**
     * Sets up animation such that model parts track the part entity they correspond to.
     */
    @Override
    public void setupAnim(T entity, float pLimbSwing, float pLimbSwingAmount, float ageInTicks, float pNetHeadYaw, float pHeadPitch) {
        // entity.getParts() is a PartEntity<?>[] at runtime (see Marionette#getMarionetteParts),
        // why not a MarionettePart<?>[]: array covariance means casting the whole array would throw
        // a ClassCastException even though every element really is a MarionettePart. so cast per element.
        PartEntity<?>[] allParts = entity.getParts();
        float partialTicks = ageInTicks - entity.tickCount;
        for (int i = 0; i < allSegments.length; i++) {
            MarionettePart<?> part = (MarionettePart<?>) allParts[i];

            // same world-to-model mapping setPos uses below, (x, -y, -z), so local +Z lands on that image of the direction
            applyRotation(allSegments[i], part.partFrame());

            Vec3 entityPos = entity.getPosition(partialTicks);
            Vec3 partPos = part.getPosition(partialTicks);
            double xOffset = partPos.x - entityPos.x;
            double yOffset = partPos.y - entityPos.y;
            double zOffset = partPos.z - entityPos.z;
            // default position of each part is (0,24,0). See PartDefinition definitions above to see why
            // 16 b/c 1 block is 16 units in model space
            allSegments[i].setPos((float) (16f * xOffset), (float) (24 - 16f * (yOffset + part.getBbHeight() / 2)), (float) (-16f * zOffset));
        }
    }

    private static void applyRotation(ModelPart segment, Quaternionf frame) {
        Quaternionf model = new Quaternionf(AXIS_FLIP).mul(frame).mul(HALF_TURN_Z);

        Vector3f ex = model.transform(new Vector3f(1, 0, 0));
        Vector3f ey = model.transform(new Vector3f(0, 1, 0));
        Vector3f ez = model.transform(new Vector3f(0, 0, 1));

        // atan2 of the column length, not asin(-ex.z): lock is at a direction along +-X, common, and asin loses precision before it
        float cb = Mth.sqrt(ex.x * ex.x + ex.y * ex.y);
        float yRot = (float) Math.atan2(-ex.z, cb);

        if (cb < 1.0e-6f) {
            segment.setRotation((float) Math.atan2(-ez.y, ey.y), yRot, 0f);
            return;
        }
        segment.setRotation((float) Math.atan2(ey.z, ez.z), yRot, (float) Math.atan2(ex.y, ex.x));
    }
}
